import { z } from "zod";
import { TAX_TYPE_CODES } from "@/lib/constants";
import { colomboTodayIso } from "@/lib/format";
import { amountField, isoDateField } from "@/lib/money";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v ? v : null));

/**
 * One payment to the IRD for an obligation. Dates are not restricted to the period
 * (payments can be made years later, PLAN.md section 3), but cannot be in the future.
 */
export const paymentSchema = z
  .object({
    client_id: z.uuid(),
    tax_type: z.enum(TAX_TYPE_CODES),
    period_id: z.uuid(),
    paid_on: isoDateField,
    amount: amountField,
    paid_by: z.enum(["firm", "client_direct"], { message: "Choose who paid." }),
    ref_no: optionalText(100),
    note: optionalText(1000),
  })
  .superRefine((p, ctx) => {
    if (p.paid_on > colomboTodayIso()) {
      ctx.addIssue({ code: "custom", path: ["paid_on"], message: "The payment date cannot be in the future." });
    }
  });

export type PaymentInput = z.input<typeof paymentSchema>;
