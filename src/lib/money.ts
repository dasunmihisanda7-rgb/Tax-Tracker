import { z } from "zod";

/**
 * Parses a rupee amount typed by staff: "25000", "25,000.50", " 1 000 ".
 * Returns null unless it is a positive number with at most two decimals
 * and fits numeric(14,2).
 */
export function parseAmount(input: string): number | null {
  const cleaned = input.replace(/[,\s]/g, "").replace(/^Rs\.?/i, "");
  if (!/^\d{1,12}(\.\d{1,2})?$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n > 0 ? n : null;
}

/** Zod field for an amount typed as text. */
export const amountField = z
  .string()
  .transform((v, ctx) => {
    const n = parseAmount(v);
    if (n === null) {
      ctx.addIssue({
        code: "custom",
        message: v.trim() ? "Enter an amount above zero with at most two decimals." : "Enter the amount.",
      });
      return z.NEVER;
    }
    return n;
  });

export const isoDateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.");
