"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { friendlyDbError, requireUser } from "@/lib/auth/require-user";
import { issueKey, receiptSchema, type ReceiptInput } from "./schema";

export type ReceiptResult =
  | { ok: true; count: number }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function validate(input: ReceiptInput) {
  const parsed = receiptSchema.safeParse(input);
  if (parsed.success) return { data: parsed.data } as const;
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issueKey(issue.path);
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return {
    error: { ok: false as const, error: "Check the highlighted fields.", fieldErrors },
  } as const;
}

/**
 * Saves one receipt as one row per line, all with the same date, method, mode and
 * reference number. A single INSERT, so either every line is saved or none is.
 */
export async function addReceipt(input: ReceiptInput): Promise<ReceiptResult> {
  const { supabase } = await requireUser();
  const v = validate(input);
  if ("error" in v) return v.error!;
  const r = v.data;

  const rows = r.lines.map((l) => ({
    client_id: r.client_id,
    received_on: r.received_on,
    funding_method: r.funding_method,
    payment_mode: r.payment_mode,
    ref_no: r.ref_no,
    note: r.note,
    tax_type: l.tax_type,
    period_id: l.period_id,
    amount: l.amount,
  }));
  const { error } = await supabase.from("client_receipts").insert(rows);
  if (error) return { ok: false, error: friendlyDbError(error) };
  refresh();
  return { ok: true, count: rows.length };
}

/** Edits one receipt row (the edit form always has exactly one line). */
export async function updateReceipt(id: string, input: ReceiptInput): Promise<ReceiptResult> {
  const { supabase } = await requireUser();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Unknown receipt." };
  const v = validate(input);
  if ("error" in v) return v.error!;
  const r = v.data;
  if (r.lines.length !== 1) return { ok: false, error: "A receipt row has exactly one line." };
  const l = r.lines[0];

  const { error, count } = await supabase
    .from("client_receipts")
    .update(
      {
        client_id: r.client_id,
        received_on: r.received_on,
        funding_method: r.funding_method,
        payment_mode: r.payment_mode,
        ref_no: r.ref_no,
        note: r.note,
        tax_type: l.tax_type,
        period_id: l.period_id,
        amount: l.amount,
      },
      { count: "exact" },
    )
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return { ok: false, error: friendlyDbError(error) };
  if (!count) return { ok: false, error: "This receipt was deleted. Go back to the list." };
  refresh();
  return { ok: true, count: 1 };
}

/** Soft-deletes a receipt row. It disappears from screens; the audit log keeps it. */
export async function deleteReceipt(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireUser();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Unknown receipt." };
  const { error, count } = await supabase
    .from("client_receipts")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return { ok: false, error: friendlyDbError(error) };
  if (!count) return { ok: false, error: "This receipt was already deleted." };
  refresh();
  return { ok: true };
}
