import type { TaxType } from "@/lib/constants";

/** Tab on the Tax Advice / IRD Payments screens for a tax type. */
export const tabForTaxType = (t: TaxType) => (t === "WHT" ? "wht" : t === "APIT" ? "apit" : "income");

/** Start year from a period year_key: "2026/27" -> "2026", "2026" -> "2026". */
export const yearFromKey = (yearKey: string) => yearKey.slice(0, 4);

/** Link to one obligation's cell in the IRD Payments grid, with its side panel open. */
export function irdCellHref(o: { client_id: string; tax_type: TaxType; period_id: string; year_key: string }) {
  return `/ird-payments?tab=${tabForTaxType(o.tax_type)}&year=${yearFromKey(o.year_key)}&open=${o.client_id}:${o.tax_type}:${o.period_id}`;
}

/** Link to the Tax Advice grid filtered to clients not advised for a period code. */
export function notAdvisedHref(taxType: TaxType, yearKey: string, code: string) {
  return `/tax-advice?tab=${tabForTaxType(taxType)}&year=${yearFromKey(yearKey)}&na=${code}`;
}
