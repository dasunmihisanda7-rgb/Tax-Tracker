"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { friendlyDbError, requireUser } from "@/lib/auth/require-user";
import { issueKey } from "@/lib/receipts/schema";
import { paymentSchema, type PaymentInput } from "./schema";

export type PaymentResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

function validate(input: PaymentInput) {
  const parsed = paymentSchema.safeParse(input);
  if (parsed.success) return { data: parsed.data } as const;
  const fieldErrors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const key = issueKey(issue.path);
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { error: { ok: false as const, error: "Check the highlighted fields.", fieldErrors } } as const;
}

/** Records a payment made to the IRD. Many payments per obligation are allowed. */
export async function addPayment(input: PaymentInput): Promise<PaymentResult> {
  const { supabase } = await requireUser();
  const v = validate(input);
  if ("error" in v) return v.error!;
  const { error } = await supabase.from("ird_payments").insert(v.data);
  if (error) return { ok: false, error: friendlyDbError(error) };
  refresh();
  return { ok: true };
}

/** Edits a payment's date, amount, payer, reference or note (the obligation stays the same). */
export async function updatePayment(id: string, input: PaymentInput): Promise<PaymentResult> {
  const { supabase } = await requireUser();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Unknown payment." };
  const v = validate(input);
  if ("error" in v) return v.error!;
  const { paid_on, amount, paid_by, ref_no, note } = v.data;
  const { error, count } = await supabase
    .from("ird_payments")
    .update({ paid_on, amount, paid_by, ref_no, note }, { count: "exact" })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return { ok: false, error: friendlyDbError(error) };
  if (!count) return { ok: false, error: "This payment was deleted." };
  refresh();
  return { ok: true };
}

/** Soft-deletes a payment. The audit log keeps it. */
export async function deletePayment(id: string): Promise<PaymentResult> {
  const { supabase } = await requireUser();
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Unknown payment." };
  const { error, count } = await supabase
    .from("ird_payments")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return { ok: false, error: friendlyDbError(error) };
  if (!count) return { ok: false, error: "This payment was already deleted." };
  refresh();
  return { ok: true };
}
