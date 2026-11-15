import type { PeriodFamily, TaxType } from "@/lib/constants";

/** Tabs on the Tax Advice (and later IRD Payments) screens. */
export const ADVICE_TABS: { value: string; label: string; taxTypes: TaxType[]; family: PeriodFamily }[] = [
  { value: "income", label: "Income tax", taxTypes: ["CIT", "IIT", "PIT"], family: "income" },
  { value: "wht", label: "WHT", taxTypes: ["WHT"], family: "monthly" },
  { value: "apit", label: "APIT", taxTypes: ["APIT"], family: "monthly" },
];
