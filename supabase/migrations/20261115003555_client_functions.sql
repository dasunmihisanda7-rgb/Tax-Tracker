-- =============================================================================
-- Phase 2: client write functions.
-- All run as the caller (security invoker), so RLS and grants still apply.
-- =============================================================================

-- Creates (p_id null) or updates a client and sets its tax types in one transaction.
-- Tax types not in p_tax_types are set inactive (rows are kept), listed ones are (re)activated.
create function public.save_client(
  p_id             uuid,
  p_name           text,
  p_client_type    public.client_type,
  p_contact_person text,
  p_email          text,
  p_phone          text,
  p_tin            text,
  p_notes          text,
  p_is_active      boolean,
  p_tax_types      public.tax_type[]
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id    uuid;
  v_types public.tax_type[] := coalesce(p_tax_types, '{}');
begin
  if p_id is null then
    insert into public.clients (name, client_type, contact_person, email, phone, tin, notes, is_active)
    values (
      btrim(p_name), p_client_type,
      nullif(btrim(p_contact_person), ''), nullif(btrim(p_email), ''),
      nullif(btrim(p_phone), ''), nullif(btrim(p_tin), ''), nullif(btrim(p_notes), ''),
      coalesce(p_is_active, true)
    )
    returning id into v_id;
  else
    update public.clients
       set name           = btrim(p_name),
           client_type    = p_client_type,
           contact_person = nullif(btrim(p_contact_person), ''),
           email          = nullif(btrim(p_email), ''),
           phone          = nullif(btrim(p_phone), ''),
           tin            = nullif(btrim(p_tin), ''),
           notes          = nullif(btrim(p_notes), ''),
           is_active      = coalesce(p_is_active, true)
     where id = p_id and deleted_at is null
    returning id into v_id;
    if v_id is null then
      raise exception 'Client not found' using errcode = 'P0002';
    end if;
  end if;

  insert into public.client_tax_types (client_id, tax_type)
  select v_id, t from unnest(v_types) as t
  on conflict (client_id, tax_type) do update
    set is_active = true
    where public.client_tax_types.is_active = false;

  update public.client_tax_types
     set is_active = false
   where client_id = v_id and is_active and not (tax_type = any (v_types));

  return v_id;
end;
$$;

-- Bulk add. p_rows is a JSON array of {"name", "client_type", "tax_types": [...]}.
-- Each row is saved on its own (one bad row does not stop the others).
-- Returns a JSON array of {"index", "ok", "id" | "error"} in input order.
create function public.import_clients(p_rows jsonb)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row    jsonb;
  v_index  integer := 0;
  v_id     uuid;
  v_result jsonb := '[]'::jsonb;
begin
  if jsonb_typeof(p_rows) <> 'array' then
    raise exception 'import_clients expects a JSON array';
  end if;

  for v_row in select value from jsonb_array_elements(p_rows)
  loop
    begin
      v_id := public.save_client(
        null,
        v_row ->> 'name',
        (v_row ->> 'client_type')::public.client_type,
        null, null, null, null, null, true,
        array(select jsonb_array_elements_text(coalesce(v_row -> 'tax_types', '[]'::jsonb))::public.tax_type)
      );
      v_result := v_result || jsonb_build_object('index', v_index, 'ok', true, 'id', v_id);
    exception
      when unique_violation then
        v_result := v_result || jsonb_build_object('index', v_index, 'ok', false,
          'error', 'A client with this name already exists.');
      when others then
        v_result := v_result || jsonb_build_object('index', v_index, 'ok', false, 'error', sqlerrm);
    end;
    v_index := v_index + 1;
  end loop;

  return v_result;
end;
$$;

-- Soft-deletes a client, but only when it has no live advice marks, receipts or payments.
-- Clients with records can only be set inactive.
create function public.soft_delete_client(p_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if exists (select 1 from public.advice_marks    where client_id = p_id and deleted_at is null)
  or exists (select 1 from public.client_receipts where client_id = p_id and deleted_at is null)
  or exists (select 1 from public.ird_payments    where client_id = p_id and deleted_at is null) then
    raise exception 'This client has advice marks, receipts or payments, so it cannot be deleted. Set it inactive instead.'
      using errcode = 'P0001';
  end if;

  update public.clients set deleted_at = now() where id = p_id and deleted_at is null;
  if not found then
    raise exception 'Client not found' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.save_client(uuid, text, public.client_type, text, text, text, text, text, boolean, public.tax_type[]) from public, anon;
revoke all on function public.import_clients(jsonb)    from public, anon;
revoke all on function public.soft_delete_client(uuid) from public, anon;

grant execute on function public.save_client(uuid, text, public.client_type, text, text, text, text, text, boolean, public.tax_type[]) to authenticated;
grant execute on function public.import_clients(jsonb)    to authenticated;
grant execute on function public.soft_delete_client(uuid) to authenticated;
