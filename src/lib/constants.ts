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

export type FundingMethod = Enums<"funding_method">;
export type PaymentMode = Enums<"payment_mode">;
export type PaidBy = Enums<"paid_by">;

/** How the money moved (PLAN.md section 4). */
export const FUNDING_METHODS: { value: FundingMethod; label: string; hint: string }[] = [
  { value: "client_paid_first", label: "Client paid first", hint: "The client gave the money before the IRD payment" },
  { value: "reimbursement", label: "Reimbursement", hint: "The firm paid the IRD first; the client is paying it back" },
];
export const FUNDING_METHOD_VALUES = FUNDING_METHODS.map((f) => f.value) as [FundingMethod, ...FundingMethod[]];
export const fundingLabel = (v: FundingMethod) => FUNDING_METHODS.find((f) => f.value === v)?.label ?? v;

export const PAYMENT_MODES: { value: PaymentMode; label: string }[] = [
  { value: "cheque", label: "Cheque" },
  { value: "online_transfer", label: "Online transfer" },
  { value: "cash", label: "Cash" },
];
export const PAYMENT_MODE_VALUES = PAYMENT_MODES.map((m) => m.value) as [PaymentMode, ...PaymentMode[]];
export const paymentModeLabel = (v: PaymentMode) => PAYMENT_MODES.find((m) => m.value === v)?.label ?? v;

export const PAID_BY: { value: PaidBy; label: string }[] = [
  { value: "firm", label: "Firm" },
  { value: "client_direct", label: "Client directly" },
];
export const paidByLabel = (v: PaidBy) => PAID_BY.find((p) => p.value === v)?.label ?? v;

export type MoneyStatus = "no_activity" | "payment_pending" | "to_recover" | "settled";

/**
 * Year keys used by tax_periods for a chosen year Y:
 * income year of assessment "Y/YY+1" and monthly calendar year "Y".
 */
export function yearKeys(year: number) {
  const next = String((year + 1) % 100).padStart(2, "0");
  return { income: `${year}/${next}`, monthly: String(year) };
}
