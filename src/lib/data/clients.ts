import "server-only";
import { createClient } from "@/lib/supabase/server";
import { TAX_TYPES, yearKeys, type TaxType } from "@/lib/constants";
import { colomboYear } from "@/lib/format";
import { first, type SearchParams } from "./params";

const order = TAX_TYPES.map((t) => t.code);

/** Clients list with the search, tax type and status filters. */
export async function loadClients(sp: SearchParams) {
  // Characters with meaning in PostgREST's or() syntax become the * wildcard ("match anything").
  const q = first(sp.q).trim().replace(/[,()*%\\:"']/g, "*");
  const tax = first(sp.tax) as TaxType | "";
  const status = first(sp.status) || "active";

  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select("id, name, client_type, contact_person, email, phone, tin, is_active, notes, client_tax_types(tax_type, is_active)")
    .is("deleted_at", null)
    .order("name");
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);
  if (q) query = query.or(`name.ilike.*${q}*,contact_person.ilike.*${q}*,tin.ilike.*${q}*`);

  const { data, error } = await query;
  const clients = (data ?? [])
    .map((c) => ({
      ...c,
      taxTypes: c.client_tax_types
        .filter((t) => t.is_active)
        .map((t) => t.tax_type)
        .sort((a, b) => order.indexOf(a) - order.indexOf(b)),
    }))
    .filter((c) => !tax || c.taxTypes.includes(tax));
  return { clients, filtered: Boolean(q || tax || status !== "active"), error: error?.message ?? null };
}

/** One client and its obligations for the chosen year (income Y/Y+1 and monthly Y). */
export async function loadClientYear(id: string, sp: SearchParams) {
  const supabase = await createClient();
  const [clientRes, periodsRes, profilesRes, marks, receipts, payments] = await Promise.all([
    supabase.from("clients").select("*, client_tax_types(tax_type, is_active)").eq("id", id).is("deleted_at", null).maybeSingle(),
    supabase.from("tax_periods").select("year_key").is("deleted_at", null),
    supabase.from("profiles").select("id, full_name"),
    supabase.from("advice_marks").select("id", { count: "exact", head: true }).eq("client_id", id).is("deleted_at", null),
    supabase.from("client_receipts").select("id", { count: "exact", head: true }).eq("client_id", id).is("deleted_at", null),
    supabase.from("ird_payments").select("id", { count: "exact", head: true }).eq("client_id", id).is("deleted_at", null),
  ]);
  const client = clientRes.data;
  if (!client) return null;

  const years = [...new Set((periodsRes.data ?? []).map((p) => Number(p.year_key.slice(0, 4))))].sort((a, b) => b - a);
  const requested = Number(first(sp.year));
  const thisYear = colomboYear();
  const year = years.includes(requested) ? requested : years.includes(thisYear) ? thisYear : (years[0] ?? thisYear);
  const keys = yearKeys(year);

  const { data: obligations } = await supabase
    .from("obligation_status")
    .select("*")
    .eq("client_id", id)
    .in("year_key", [keys.income, keys.monthly])
    .order("sort_order");

  const activeTypes = order.filter((code) => client.client_tax_types.some((t) => t.is_active && t.tax_type === code));
  return {
    client,
    years,
    year,
    keys,
    obligations: obligations ?? [],
    names: new Map((profilesRes.data ?? []).map((p) => [p.id, p.full_name])),
    activeTypes,
    hasRecords: (marks.count ?? 0) + (receipts.count ?? 0) + (payments.count ?? 0) > 0,
  };
}
