-- =============================================================================
-- Phase 6: add receipt / payment dates to obligation_status.
--   first_received_on: earliest live receipt (Outstanding "held since", oldest first)
--   last_received_on:  latest live receipt
--   last_paid_on:      latest live IRD payment (Outstanding "to recover")
-- Columns are appended, so existing readers are unaffected.
-- =============================================================================
create or replace view public.obligation_status
with (security_invoker = true)
as
with received as (
  select client_id, tax_type, period_id,
         sum(amount)      as total,
         min(received_on) as first_on,
         max(received_on) as last_on
  from public.client_receipts
  where deleted_at is null
  group by client_id, tax_type, period_id
),
paid as (
  select client_id, tax_type, period_id,
         sum(amount)                                              as total,
         coalesce(sum(amount) filter (where paid_by = 'firm'), 0) as firm_total,
         max(paid_on)                                             as last_on
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
    (r.total is not null or pd.total is not null)           as has_activity,
    r.first_on               as first_received_on,
    r.last_on                as last_received_on,
    pd.last_on               as last_paid_on
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
  end as money_status,
  first_received_on, last_received_on, last_paid_on
from base;

comment on view public.obligation_status is
  'One row per active client tax type and period, with advice and money status. All screens read status from here.';

grant select on public.obligation_status to authenticated;
