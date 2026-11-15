import type { Enums } from "@/lib/supabase/database.types";

export type TaxType = Enums<"tax_type">;
export type ClientType = Enums<"client_type">;
export type PeriodFamily = Enums<"period_family">;

/** Tax types in display order (PLAN.md section 3). */
export const TAX_TYPES: { code: TaxType; name: string; family: PeriodFamily }[] = [
  { code: "CIT", name: "Corporate Income Tax", family: "income" },
  { code: "IIT", name: "Individual Income Tax", family: "income" },
  { code: "PIT", name: "Partnership Income Tax", family: "income" },
  { code: "WHT", name: "Withholding Tax", family: "monthly" },
  { code: "APIT", name: "Advance Personal Income Tax", family: "monthly" },
];
export const TAX_TYPE_CODES = TAX_TYPES.map((t) => t.code) as [TaxType, ...TaxType[]];

export function taxFamily(t: TaxType): PeriodFamily {
  return t === "WHT" || t === "APIT" ? "monthly" : "income";
}

export const CLIENT_TYPES: { value: ClientType; label: string }[] = [
  { value: "company", label: "Company" },
  { value: "individual", label: "Individual" },
  { value: "partnership", label: "Partnership" },
];
export const CLIENT_TYPE_VALUES = CLIENT_TYPES.map((t) => t.value) as [ClientType, ...ClientType[]];
export const clientTypeLabel = (v: ClientType) =>
  CLIENT_TYPES.find((t) => t.value === v)?.label ?? v;

export type MoneyStatus = "no_activity" | "payment_pending" | "to_recover" | "settled";

/**
 * Year keys used by tax_periods for a chosen year Y:
 * income year of assessment "Y/YY+1" and monthly calendar year "Y".
 */
export function yearKeys(year: number) {
  const next = String((year + 1) % 100).padStart(2, "0");
  return { income: `${year}/${next}`, monthly: String(year) };
}
