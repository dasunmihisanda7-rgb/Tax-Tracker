import "server-only";
import { createClient } from "@/lib/supabase/server";
import { TAX_TYPES, type PeriodFamily, type TaxType } from "@/lib/constants";

export type FormClient = { id: string; name: string; taxTypes: TaxType[] };
export type FormPeriod = {
  id: string;
  family: PeriodFamily;
  code: string;
  label: string;
  year_key: string;
  sort_order: number;
};

/**
 * Clients (with the tax types they are registered for) and all periods, for the
 * receipt and payment forms. `includeClientId` keeps an inactive client in the
 * list when editing one of its existing records.
 */
export async function loadEntryFormData(includeClientId?: string) {
  const supabase = await createClient();
  const [clientsRes, periodsRes] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, is_active, client_tax_types(tax_type, is_active)")
      .is("deleted_at", null)
      .order("name"),
    supabase
      .from("tax_periods")
      .select("id, family, code, label, year_key, sort_order")
      .is("deleted_at", null)
      .order("sort_order", { ascending: false }),
  ]);

  const order = TAX_TYPES.map((t) => t.code);
  const clients: FormClient[] = (clientsRes.data ?? [])
    .filter((c) => c.is_active || c.id === includeClientId)
    .map((c) => ({
      id: c.id,
      name: c.is_active ? c.name : `${c.name} (inactive)`,
      taxTypes: c.client_tax_types
        .filter((t) => t.is_active || c.id === includeClientId)
        .map((t) => t.tax_type)
        .sort((a, b) => order.indexOf(a) - order.indexOf(b)),
    }));
  return { clients, periods: (periodsRes.data ?? []) as FormPeriod[] };
}
