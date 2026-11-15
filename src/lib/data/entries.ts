import "server-only";
import { createClient } from "@/lib/supabase/server";
import { yearKeys, type FundingMethod, type PaidBy, type PaymentMode, type TaxType } from "@/lib/constants";
import { first, isIso, isUuid, likeEscape, type SearchParams } from "./params";

export const ROW_LIMIT = 5000;

/** Clients, periods and years for the filter bar shared by the receipts and payments lists. */
async function loadFilterOptions() {
  const supabase = await createClient();
  const [clientsRes, periodsRes] = await Promise.all([
    supabase.from("clients").select("id, name").is("deleted_at", null).order("name"),
    supabase
      .from("tax_periods")
      .select("id, family, code, label, year_key, sort_order")
      .is("deleted_at", null)
      .order("sort_order"),
  ]);
  const periods = periodsRes.data ?? [];
  const years = [...new Set(periods.map((p) => Number(p.year_key.slice(0, 4))))].sort((a, b) => b - a);
  return { supabase, clients: clientsRes.data ?? [], periods, years };
}

/** Period ids belonging to a "year" (income Y/Y+1 and monthly Y). */
function periodIdsForYear(periods: { id: string; year_key: string }[], year: number) {
  const keys = yearKeys(year);
  const ids = periods.filter((p) => p.year_key === keys.income || p.year_key === keys.monthly).map((p) => p.id);
  return ids.length ? ids : ["00000000-0000-0000-0000-000000000000"];
}

// ---------------------------------------------------------------------------
// Client receipts
// ---------------------------------------------------------------------------

export async function loadReceipts(sp: SearchParams) {
  const f = {
    client: first(sp.client),
    tax: first(sp.tax) as TaxType | "",
    year: Number(first(sp.year)) || null,
    period: first(sp.period),
    funding: first(sp.funding) as FundingMethod | "",
    mode: first(sp.mode) as PaymentMode | "",
    from: first(sp.from),
    to: first(sp.to),
    ref: first(sp.ref).trim(),
  };
  const { supabase, clients, periods, years } = await loadFilterOptions();

  let query = supabase
    .from("client_receipts")
    .select(
      "id, received_on, funding_method, payment_mode, ref_no, tax_type, amount, note, created_at, clients(name), tax_periods!client_receipts_period_family_fkey(code, label, year_key), profiles!client_receipts_created_by_fkey(full_name)",
    )
    .is("deleted_at", null)
    .order("received_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);
  if (isUuid(f.client)) query = query.eq("client_id", f.client);
  if (f.tax) query = query.eq("tax_type", f.tax);
  if (f.funding) query = query.eq("funding_method", f.funding);
  if (f.mode) query = query.eq("payment_mode", f.mode);
  if (isIso(f.from)) query = query.gte("received_on", f.from);
  if (isIso(f.to)) query = query.lte("received_on", f.to);
  if (f.ref) query = query.ilike("ref_no", `%${likeEscape(f.ref)}%`);
  if (isUuid(f.period)) query = query.eq("period_id", f.period);
  else if (f.year) query = query.in("period_id", periodIdsForYear(periods, f.year));

  const { data, error } = await query;
  const rows = (data ?? []).map((r) => ({
    id: r.id,
    received_on: r.received_on,
    client_name: r.clients?.name ?? "",
    funding_method: r.funding_method,
    payment_mode: r.payment_mode,
    ref_no: r.ref_no,
    tax_type: r.tax_type,
    period_code: r.tax_periods?.code ?? "",
    period_label: r.tax_periods?.label ?? "",
    year_key: r.tax_periods?.year_key ?? "",
    amount: Number(r.amount),
    note: r.note,
    entered_by: r.profiles?.full_name ?? "",
  }));
  return {
    filters: f,
    filtered: Object.values(f).some(Boolean),
    clients,
    periods,
    years,
    rows,
    total: rows.reduce((s, r) => s + r.amount, 0),
    error: error?.message ?? null,
  };
}
export type ReceiptRow = Awaited<ReturnType<typeof loadReceipts>>["rows"][number];

// ---------------------------------------------------------------------------
// IRD payments (flat list)
// ---------------------------------------------------------------------------

export async function loadPayments(sp: SearchParams) {
  const f = {
    client: first(sp.client),
    tax: first(sp.tax) as TaxType | "",
    year: Number(first(sp.year)) || null,
    period: first(sp.period),
    paidBy: first(sp.paid_by) as PaidBy | "",
    from: first(sp.from),
    to: first(sp.to),
    ref: first(sp.ref).trim(),
  };
  const { supabase, clients, periods, years } = await loadFilterOptions();

  let query = supabase
    .from("ird_payments")
    .select(
      "id, client_id, tax_type, period_id, paid_on, amount, paid_by, ref_no, note, created_at, clients(name), tax_periods!ird_payments_period_family_fkey(code, label, year_key), profiles!ird_payments_created_by_fkey(full_name)",
    )
    .is("deleted_at", null)
    .order("paid_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);
  if (isUuid(f.client)) query = query.eq("client_id", f.client);
  if (f.tax) query = query.eq("tax_type", f.tax);
  if (f.paidBy) query = query.eq("paid_by", f.paidBy);
  if (isIso(f.from)) query = query.gte("paid_on", f.from);
  if (isIso(f.to)) query = query.lte("paid_on", f.to);
  if (f.ref) query = query.ilike("ref_no", `%${likeEscape(f.ref)}%`);
  if (isUuid(f.period)) query = query.eq("period_id", f.period);
  else if (f.year) query = query.in("period_id", periodIdsForYear(periods, f.year));

  const { data, error } = await query;
  const rows = (data ?? []).map((r) => ({
    id: r.id,
    client_id: r.client_id,
    period_id: r.period_id,
    paid_on: r.paid_on,
    client_name: r.clients?.name ?? "",
    tax_type: r.tax_type,
    period_code: r.tax_periods?.code ?? "",
    period_label: r.tax_periods?.label ?? "",
    year_key: r.tax_periods?.year_key ?? "",
    amount: Number(r.amount),
    paid_by: r.paid_by,
    ref_no: r.ref_no,
    note: r.note,
    entered_by: r.profiles?.full_name ?? "",
  }));
  return {
    filters: f,
    filtered: Object.values(f).some(Boolean),
    clients,
    periods,
    years,
    rows,
    total: rows.reduce((s, r) => s + r.amount, 0),
    error: error?.message ?? null,
  };
}
export type PaymentRow = Awaited<ReturnType<typeof loadPayments>>["rows"][number];
