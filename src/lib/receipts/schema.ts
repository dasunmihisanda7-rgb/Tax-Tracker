import { z } from "zod";
import {
  FUNDING_METHOD_VALUES,
  PAYMENT_MODE_VALUES,
  TAX_TYPE_CODES,
} from "@/lib/constants";
import { colomboTodayIso } from "@/lib/format";
import { amountField, isoDateField } from "@/lib/money";

const lineSchema = z.object({
  tax_type: z.enum(TAX_TYPE_CODES, { message: "Choose the tax type." }),
  period_id: z.uuid({ message: "Choose the period." }),
  amount: amountField,
});

/**
 * One receipt entry: a single cheque / transfer / cash payment from one client,
 * split over one or more lines (tax type + period + amount). Each line becomes
 * one client_receipts row sharing the same date, method, mode and reference.
 */
export const receiptSchema = z
  .object({
    client_id: z.uuid({ message: "Choose the client." }),
    received_on: isoDateField,
    funding_method: z.enum(FUNDING_METHOD_VALUES, { message: "Choose the funding method." }),
    payment_mode: z.enum(PAYMENT_MODE_VALUES, { message: "Choose the payment mode." }),
    ref_no: z
      .string()
      .trim()
      .max(100)
      .transform((v) => (v ? v : null)),
    note: z
      .string()
      .trim()
      .max(1000)
      .transform((v) => (v ? v : null)),
    lines: z.array(lineSchema).min(1, "Add at least one line.").max(50, "Use at most 50 lines."),
  })
  .superRefine((r, ctx) => {
    if (r.received_on > colomboTodayIso()) {
      ctx.addIssue({ code: "custom", path: ["received_on"], message: "The date received cannot be in the future." });
    }
    if (r.payment_mode !== "cash" && !r.ref_no) {
      ctx.addIssue({
        code: "custom",
        path: ["ref_no"],
        message: "Enter the reference number for cheques and online transfers.",
      });
    }
    const seen = new Set<string>();
    r.lines.forEach((l, i) => {
      const key = `${l.tax_type}:${l.period_id}`;
      if (seen.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: ["lines", i, "period_id"],
          message: "This period is already on another line. Combine the amounts.",
        });
      }
      seen.add(key);
    });
  });

export type ReceiptInput = z.input<typeof receiptSchema>;
export type ReceiptLineInput = z.input<typeof lineSchema>;

/** Error path from zod as a form key, e.g. "ref_no" or "lines.1.amount". */
export const issueKey = (path: PropertyKey[]) => path.map(String).join(".");
