-- =============================================================================
-- Vidhana & Co. Tax Tracker: core schema (PLAN.md sections 3, 4, 5 and 6)
--
-- Tables: profiles, clients, client_tax_types, tax_periods, advice_marks,
--         client_receipts, ird_payments, audit_log
-- View:   obligation_status
-- Func:   generate_periods(year)
--
-- Security model:
--   * RLS on every table. authenticated = read + insert + update; anon = nothing.
--   * No hard deletes: DELETE is revoked and has no policy. Rows are soft-deleted
--     by setting deleted_at.
--   * created_by / updated_by / timestamps are set by triggers, not by clients.
--   * audit_log is written only by triggers (security definer).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Enums
-- -----------------------------------------------------------------------------
create type public.client_type    as enum ('company', 'individual', 'partnership');
create type public.tax_type       as enum ('CIT', 'IIT', 'PIT', 'WHT', 'APIT');
create type public.period_family  as enum ('income', 'monthly');
create type public.funding_method as enum ('client_paid_first', 'reimbursement');
create type public.payment_mode   as enum ('cheque', 'online_transfer', 'cash');
create type public.paid_by        as enum ('firm', 'client_direct');
create type public.audit_action   as enum ('insert', 'update', 'delete');

-- CIT, IIT, PIT use income periods; WHT, APIT use monthly periods.
create function public.tax_family(t public.tax_type)
returns public.period_family
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case when t in ('CIT', 'IIT', 'PIT') then 'income'::public.period_family
              else 'monthly'::public.period_family end;
$$;

-- Today's date in Sri Lanka, used for date defaults.
create function public.colombo_today()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Asia/Colombo')::date;
$$;

-- -----------------------------------------------------------------------------
-- Shared trigger: audit columns
-- On insert: created_* and updated_* come from now() and auth.uid().
-- On update: created_* cannot change; updated_* are refreshed.
-- -----------------------------------------------------------------------------
create function public.set_row_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := now();
    new.created_by := coalesce(auth.uid(), new.created_by);
  else
    new.created_at := old.created_at;
    new.created_by := old.created_by;
  end if;
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), case when tg_op = 'INSERT' then new.created_by end);
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles: one row per staff login
-- -----------------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  email       text,
  created_at  timestamptz not null default now(),
  created_by  uuid,
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  deleted_at  timestamptz
);
comment on table public.profiles is 'One row per staff login. Created automatically from auth.users.';

-- Audit-column foreign keys on profiles itself (added after the table exists).
alter table public.profiles
  add constraint profiles_created_by_fkey foreign key (created_by) references public.profiles (id) on delete set null,
  add constraint profiles_updated_by_fkey foreign key (updated_by) references public.profiles (id) on delete set null;

-- -----------------------------------------------------------------------------
-- clients
-- -----------------------------------------------------------------------------
create table public.clients (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (btrim(name) <> ''),
  client_type     public.client_type not null,
  contact_person  text,
  email           text,
  phone           text,
  tin             text,
  is_active       boolean not null default true,
  notes           text,
  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles (id) on delete set null,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles (id) on delete set null,
  deleted_at      timestamptz
);
-- Name unique among non-deleted rows (case- and surrounding-space-insensitive).
create unique index clients_name_unique_live
  on public.clients (lower(btrim(name)))
  where deleted_at is null;

-- -----------------------------------------------------------------------------
-- client_tax_types: which tax types a client pays
-- Unticking a tax type sets is_active = false (the row is kept).
-- -----------------------------------------------------------------------------
create table public.client_tax_types (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients (id),
  tax_type    public.tax_type not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null,
  deleted_at  timestamptz,
  constraint client_tax_types_client_tax_unique unique (client_id, tax_type)
);

-- -----------------------------------------------------------------------------
-- tax_periods: generated by generate_periods(), never typed by users
-- -----------------------------------------------------------------------------
create table public.tax_periods (
  id          uuid primary key default gen_random_uuid(),
  family      public.period_family not null,
  code        text not null check (code ~ '^[0-9]{5}$'),
  label       text not null,
  year_key    text not null,
  sort_order  integer not null,
  due_date    date not null,
  created_at  timestamptz not null default now(),
  created_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles (id) on delete set null,
  deleted_at  timestamptz,
  constraint tax_periods_family_code_unique unique (family, code),
  -- Target for the composite foreign keys that tie a record's tax type to the period family.
  constraint tax_periods_id_family_unique unique (id, family)
);
create index tax_periods_family_year_idx on public.tax_periods (family, year_key, sort_order);

-- -----------------------------------------------------------------------------
-- Obligation records. Each carries a generated period_family column derived
-- from tax_type, and a composite FK (period_id, period_family) -> tax_periods,
-- so the database rejects a WHT/APIT record on an income period and vice versa.
-- Each also references client_tax_types (client_id, tax_type), so records can
-- only be made for tax types the client is registered for.
-- -----------------------------------------------------------------------------

-- advice_marks: row present (and not deleted) = client advised for that period.
create table public.advice_marks (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id),
  tax_type       public.tax_type not null,
  period_id      uuid not null,
  period_family  public.period_family generated always as (public.tax_family(tax_type)) stored,
  advised_on     date not null default public.colombo_today(),
  advised_by     uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id) on delete set null,
  updated_at     timestamptz not null default now(),
  updated_by     uuid references public.profiles (id) on delete set null,
  deleted_at     timestamptz,
  constraint advice_marks_period_family_fkey
    foreign key (period_id, period_family) references public.tax_periods (id, family),
  constraint advice_marks_client_tax_fkey
    foreign key (client_id, tax_type) references public.client_tax_types (client_id, tax_type)
);
-- One live mark per obligation. Unticking soft-deletes it; re-ticking inserts a new row.
create unique index advice_marks_obligation_unique_live
  on public.advice_marks (client_id, tax_type, period_id)
  where deleted_at is null;
create index advice_marks_period_idx on public.advice_marks (period_id);

-- client_receipts: money the client gave the firm.
create table public.client_receipts (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients (id),
  tax_type        public.tax_type not null,
  period_id       uuid not null,
  period_family   public.period_family generated always as (public.tax_family(tax_type)) stored,
  received_on     date not null,
  funding_method  public.funding_method not null,
  payment_mode    public.payment_mode not null,
  ref_no          text,
  amount          numeric(14, 2) not null check (amount > 0),
  note            text,
  created_at      timestamptz not null default now(),
  created_by      uuid references public.profiles (id) on delete set null,
  updated_at      timestamptz not null default now(),
  updated_by      uuid references public.profiles (id) on delete set null,
  deleted_at      timestamptz,
  constraint client_receipts_ref_no_required
    check (payment_mode = 'cash' or nullif(btrim(ref_no), '') is not null),
  constraint client_receipts_period_family_fkey
    foreign key (period_id, period_family) references public.tax_periods (id, family),
  constraint client_receipts_client_tax_fkey
    foreign key (client_id, tax_type) references public.client_tax_types (client_id, tax_type)
);
create index client_receipts_obligation_idx on public.client_receipts (client_id, tax_type, period_id);
create index client_receipts_period_idx on public.client_receipts (period_id);
create index client_receipts_ref_no_idx on public.client_receipts (ref_no);
create index client_receipts_received_on_idx on public.client_receipts (received_on);

-- ird_payments: money paid to the IRD. Many rows per obligation; dates are not restricted.
create table public.ird_payments (
  id             uuid primary key default gen_random_uuid(),
  client_id      uuid not null references public.clients (id),
  tax_type       public.tax_type not null,
  period_id      uuid not null,
  period_family  public.period_family generated always as (public.tax_family(tax_type)) stored,
  paid_on        date not null,
  amount         numeric(14, 2) not null check (amount > 0),
  paid_by        public.paid_by not null default 'firm',
  ref_no         text,
  note           text,
  created_at     timestamptz not null default now(),
  created_by     uuid references public.profiles (id) on delete set null,
  updated_at     timestamptz not null default now(),
  updated_by     uuid references public.profiles (id) on delete set null,
  deleted_at     timestamptz,
  constraint ird_payments_period_family_fkey
    foreign key (period_id, period_family) references public.tax_periods (id, family),
  constraint ird_payments_client_tax_fkey
    foreign key (client_id, tax_type) references public.client_tax_types (client_id, tax_type)
);
create index ird_payments_obligation_idx on public.ird_payments (client_id, tax_type, period_id);
create index ird_payments_period_idx on public.ird_payments (period_id);
create index ird_payments_paid_on_idx on public.ird_payments (paid_on);

-- -----------------------------------------------------------------------------
-- audit_log: append-only, written only by triggers.
-- (changed_by / changed_at play the role of the usual audit columns; the log
-- itself is never updated or deleted, so updated_* / deleted_at do not apply.)
-- -----------------------------------------------------------------------------
create table public.audit_log (
  id          uuid primary key default gen_random_uuid(),
  table_name  text not null,
  row_id      uuid not null,
  action      public.audit_action not null,
  old_data    jsonb,
  new_data    jsonb,
  changed_by  uuid references public.profiles (id) on delete set null,
  changed_at  timestamptz not null default now()
);
create index audit_log_row_idx on public.audit_log (table_name, row_id, changed_at);

-- Writes one audit row. A soft delete (deleted_at going from null to a value) is logged as 'delete'.
create function public.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_action public.audit_action;
begin
  if tg_op = 'INSERT' then
    v_action := 'insert';
  elsif tg_op = 'DELETE' then
    v_action := 'delete';
  elsif old.deleted_at is null and new.deleted_at is not null then
    v_action := 'delete';
  else
    v_action := 'update';
  end if;

  insert into public.audit_log (table_name, row_id, action, old_data, new_data, changed_by)
  values (
    tg_table_name,
    coalesce(new.id, old.id),
    v_action,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end,
    auth.uid()
  );
  return null;
end;
$$;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------
create trigger set_row_metadata before insert or update on public.profiles
  for each row execute function public.set_row_metadata();
create trigger set_row_metadata before insert or update on public.clients
  for each row execute function public.set_row_metadata();
create trigger set_row_metadata before insert or update on public.client_tax_types
  for each row execute function public.set_row_metadata();
create trigger set_row_metadata before insert or update on public.tax_periods
  for each row execute function public.set_row_metadata();
create trigger set_row_metadata before insert or update on public.advice_marks
  for each row execute function public.set_row_metadata();
create trigger set_row_metadata before insert or update on public.client_receipts
  for each row execute function public.set_row_metadata();
create trigger set_row_metadata before insert or update on public.ird_payments
  for each row execute function public.set_row_metadata();

create trigger write_audit_log after insert or update or delete on public.advice_marks
  for each row execute function public.write_audit_log();
create trigger write_audit_log after insert or update or delete on public.client_receipts
  for each row execute function public.write_audit_log();
create trigger write_audit_log after insert or update or delete on public.ird_payments
  for each row execute function public.write_audit_log();

-- -----------------------------------------------------------------------------
-- Profiles for staff logins: created automatically, existing users back-filled.
-- -----------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

insert into public.profiles (id, full_name, email)
select u.id,
       coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1)),
       u.email
from auth.users u
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- generate_periods(year)
--   Income family:  year of assessment year/(year+1), codes YYyy1..YYyy4 and YYyy0.
--   Monthly family: calendar year, codes YYMM0 for January..December.
-- Safe to run repeatedly (ON CONFLICT DO NOTHING). Returns the number of new rows.
-- -----------------------------------------------------------------------------
create function public.generate_periods(p_year integer)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_prefix   text;
  v_yy       text;
  v_inserted integer := 0;
  v_count    integer;
begin
  if p_year is null or p_year < 2000 or p_year > 2098 then
    raise exception 'generate_periods: year must be between 2000 and 2098, got %', p_year;
  end if;

  v_yy     := lpad((p_year % 100)::text, 2, '0');
  v_prefix := v_yy || lpad(((p_year + 1) % 100)::text, 2, '0');

  -- Income tax: four instalments, then the final payment. Display order 1, 2, 3, 4, 0.
  insert into public.tax_periods (family, code, label, year_key, sort_order, due_date)
  select 'income',
         v_prefix || i.suffix,
         i.label,
         p_year::text || '/' || lpad(((p_year + 1) % 100)::text, 2, '0'),
         p_year * 10 + i.ord,
         i.due
  from (values
    ('1', '1st Instalment',    1, make_date(p_year,      8, 15)),
    ('2', '2nd Instalment',    2, make_date(p_year,     11, 15)),
    ('3', '3rd Instalment',    3, make_date(p_year + 1,  2, 15)),
    ('4', '4th Instalment',    4, make_date(p_year + 1,  5, 15)),
    ('0', 'Final Tax Payment', 5, make_date(p_year + 1,  9, 30))
  ) as i(suffix, label, ord, due)
  on conflict (family, code) do nothing;
  get diagnostics v_count = row_count;
  v_inserted := v_inserted + v_count;

  -- WHT / APIT: twelve calendar months, due the 15th of the following month.
  insert into public.tax_periods (family, code, label, year_key, sort_order, due_date)
  select 'monthly',
         v_yy || lpad(m::text, 2, '0') || '0',
         to_char(make_date(p_year, m, 1), 'FMMonth YYYY'),
         p_year::text,
         p_year * 100 + m,
         (make_date(p_year, m, 15) + interval '1 month')::date
  from generate_series(1, 12) as m
  on conflict (family, code) do nothing;
  get diagnostics v_count = row_count;
  v_inserted := v_inserted + v_count;

  return v_inserted;
end;
$$;

-- -----------------------------------------------------------------------------
-- obligation_status view: one row per active client tax type and period.
-- balance = received - paid by the firm. Payments with paid_by = 'client_direct'
-- are excluded from the balance but included in paid_total.
-- security_invoker = true so the caller's RLS applies.
-- -----------------------------------------------------------------------------
create view public.obligation_status
with (security_invoker = true)
as
with received as (
  select client_id, tax_type, period_id, sum(amount) as total
  from public.client_receipts
  where deleted_at is null
  group by client_id, tax_type, period_id
),
paid as (
  select client_id, tax_type, period_id,
         sum(amount)                                  as total,
         coalesce(sum(amount) filter (where paid_by = 'firm'), 0) as firm_total
  from public.ird_payments
  where deleted_at is null
  group by client_id, tax_type, period_id
),
base as (
  select
    c.id                     as client_id,
    c.name                   as client_name,
    c.client_type,
    c.is_active              as client_is_active,
    ctt.tax_type,
    p.id                     as period_id,
    p.family                 as period_family,
    p.code                   as period_code,
    p.label                  as period_label,
    p.year_key,
    p.sort_order,
    p.due_date,
    (am.id is not null)      as is_advised,
    am.advised_on,
    am.advised_by,
    coalesce(r.total, 0)::numeric(14, 2)                    as received_total,
    coalesce(pd.total, 0)::numeric(14, 2)                   as paid_total,
    coalesce(pd.firm_total, 0)::numeric(14, 2)              as paid_by_firm_total,
    (coalesce(pd.total, 0) - coalesce(pd.firm_total, 0))::numeric(14, 2) as paid_by_client_direct_total,
    (coalesce(r.total, 0) - coalesce(pd.firm_total, 0))::numeric(14, 2)  as balance,
    (r.total is not null or pd.total is not null)           as has_activity
  from public.client_tax_types ctt
  join public.clients c
    on c.id = ctt.client_id and c.deleted_at is null
  join public.tax_periods p
    on p.family = public.tax_family(ctt.tax_type) and p.deleted_at is null
  left join public.advice_marks am
    on am.client_id = ctt.client_id and am.tax_type = ctt.tax_type
   and am.period_id = p.id and am.deleted_at is null
  left join received r
    on r.client_id = ctt.client_id and r.tax_type = ctt.tax_type and r.period_id = p.id
  left join paid pd
    on pd.client_id = ctt.client_id and pd.tax_type = ctt.tax_type and pd.period_id = p.id
  where ctt.deleted_at is null and ctt.is_active
)
select
  client_id, client_name, client_type, client_is_active,
  tax_type, period_id, period_family, period_code, period_label, year_key, sort_order, due_date,
  is_advised, advised_on, advised_by,
  received_total, paid_total, paid_by_firm_total, paid_by_client_direct_total, balance,
  case
    when not has_activity then 'no_activity'
    when balance > 0      then 'payment_pending'
    when balance < 0      then 'to_recover'
    else                       'settled'
  end as money_status
from base;

comment on view public.obligation_status is
  'One row per active client tax type and period, with advice and money status. All screens read status from here.';

-- -----------------------------------------------------------------------------
-- Row Level Security: enabled on every table.
-- authenticated: select, insert, update. anon: nothing. No delete policies.
-- -----------------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.clients          enable row level security;
alter table public.client_tax_types enable row level security;
alter table public.tax_periods      enable row level security;
alter table public.advice_marks     enable row level security;
alter table public.client_receipts  enable row level security;
alter table public.ird_payments     enable row level security;
alter table public.audit_log        enable row level security;

-- profiles: rows come from the auth trigger; staff can read all and update all.
create policy "staff read profiles"   on public.profiles for select to authenticated using (true);
create policy "staff update profiles" on public.profiles for update to authenticated using (true) with check (true);

create policy "staff read clients"    on public.clients for select to authenticated using (true);
create policy "staff insert clients"  on public.clients for insert to authenticated with check (true);
create policy "staff update clients"  on public.clients for update to authenticated using (true) with check (true);

create policy "staff read client_tax_types"   on public.client_tax_types for select to authenticated using (true);
create policy "staff insert client_tax_types" on public.client_tax_types for insert to authenticated with check (true);
create policy "staff update client_tax_types" on public.client_tax_types for update to authenticated using (true) with check (true);

create policy "staff read tax_periods"   on public.tax_periods for select to authenticated using (true);
create policy "staff insert tax_periods" on public.tax_periods for insert to authenticated with check (true);
create policy "staff update tax_periods" on public.tax_periods for update to authenticated using (true) with check (true);

create policy "staff read advice_marks"   on public.advice_marks for select to authenticated using (true);
create policy "staff insert advice_marks" on public.advice_marks for insert to authenticated with check (true);
create policy "staff update advice_marks" on public.advice_marks for update to authenticated using (true) with check (true);

create policy "staff read client_receipts"   on public.client_receipts for select to authenticated using (true);
create policy "staff insert client_receipts" on public.client_receipts for insert to authenticated with check (true);
create policy "staff update client_receipts" on public.client_receipts for update to authenticated using (true) with check (true);

create policy "staff read ird_payments"   on public.ird_payments for select to authenticated using (true);
create policy "staff insert ird_payments" on public.ird_payments for insert to authenticated with check (true);
create policy "staff update ird_payments" on public.ird_payments for update to authenticated using (true) with check (true);

-- audit_log: read-only for staff; only the security-definer trigger writes to it.
create policy "staff read audit_log" on public.audit_log for select to authenticated using (true);

-- -----------------------------------------------------------------------------
-- Privileges. Supabase grants everything to anon and authenticated by default;
-- tighten that so the database itself refuses what RLS would refuse.
-- -----------------------------------------------------------------------------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;

grant select, update         on public.profiles         to authenticated;
grant select, insert, update on public.clients          to authenticated;
grant select, insert, update on public.client_tax_types to authenticated;
grant select, insert, update on public.tax_periods      to authenticated;
grant select, insert, update on public.advice_marks     to authenticated;
grant select, insert, update on public.client_receipts  to authenticated;
grant select, insert, update on public.ird_payments     to authenticated;
grant select                 on public.audit_log        to authenticated;
grant select                 on public.obligation_status to authenticated;

-- Functions staff may call directly, or that their queries need.
grant execute on function public.generate_periods(integer)       to authenticated;
grant execute on function public.tax_family(public.tax_type)     to authenticated;
grant execute on function public.colombo_today()                 to authenticated;
-- Trigger functions run as the triggering statement; set_row_metadata needs execute.
grant execute on function public.set_row_metadata()              to authenticated;
-- write_audit_log and handle_new_user are security definer and are not callable directly.

-- Future objects created by the migration role: nothing for anon by default.
alter default privileges in schema public revoke all on tables    from anon;
alter default privileges in schema public revoke all on functions from anon, public;
alter default privileges in schema public revoke all on sequences from anon;
