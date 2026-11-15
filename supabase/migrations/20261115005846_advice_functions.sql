-- =============================================================================
-- Phase 3: advice marks.
-- =============================================================================

-- Guard on advice_marks:
--   * advised_by is the user who ticked the box: set from auth.uid() on insert,
--     and it cannot be changed afterwards (changing the date keeps the original ticker;
--     updated_by records who edited it).
--   * The advice date cannot be in the future (Sri Lanka time).
create function public.advice_marks_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.advised_by := coalesce(auth.uid(), new.advised_by);
  else
    new.advised_by := old.advised_by;
  end if;

  if new.advised_on > public.colombo_today() then
    raise exception 'The advice date cannot be in the future.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger advice_marks_guard
  before insert or update on public.advice_marks
  for each row execute function public.advice_marks_guard();

-- Marks many obligations as advised in one transaction.
-- p_items: JSON array of {"client_id", "tax_type", "period_id"}.
-- Obligations that already have a live mark are left as they are (safe to repeat).
-- Returns the number of new marks.
create function public.mark_advice(p_items jsonb, p_advised_on date default null)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if jsonb_typeof(p_items) <> 'array' then
    raise exception 'mark_advice expects a JSON array';
  end if;

  insert into public.advice_marks (client_id, tax_type, period_id, advised_on)
  select distinct
         (i ->> 'client_id')::uuid,
         (i ->> 'tax_type')::public.tax_type,
         (i ->> 'period_id')::uuid,
         coalesce(p_advised_on, public.colombo_today())
  from jsonb_array_elements(p_items) as i
  on conflict (client_id, tax_type, period_id) where deleted_at is null do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.mark_advice(jsonb, date) from public, anon;
grant execute on function public.mark_advice(jsonb, date) to authenticated;
