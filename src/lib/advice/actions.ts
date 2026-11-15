"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/require-user";
import { TAX_TYPE_CODES } from "@/lib/constants";
import { colomboTodayIso } from "@/lib/format";
import type { Json } from "@/lib/supabase/database.types";

export type ActionResult = { ok: true; count?: number } | { ok: false; error: string };

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.")
  .refine((d) => d <= colomboTodayIso(), "The advice date cannot be in the future.");

const itemsSchema = z
  .array(
    z.object({
      client_id: z.uuid(),
      tax_type: z.enum(TAX_TYPE_CODES),
      period_id: z.uuid(),
    }),
  )
  .min(1, "Nothing to mark.")
  .max(5000);

export type AdviceItem = z.infer<typeof itemsSchema>[number];

/**
 * Marks one or many obligations as advised (one cell, a whole year for a client,
 * or one period for selected clients). Existing marks are left unchanged.
 */
export async function markAdvice(items: AdviceItem[], advisedOn?: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const parsedItems = itemsSchema.safeParse(items);
  if (!parsedItems.success) return { ok: false, error: parsedItems.error.issues[0].message };
  const date = advisedOn ?? colomboTodayIso();
  const parsedDate = isoDate.safeParse(date);
  if (!parsedDate.success) return { ok: false, error: parsedDate.error.issues[0].message };

  const { data, error } = await supabase.rpc("mark_advice", {
    p_items: parsedItems.data as unknown as Json,
    p_advised_on: parsedDate.data,
  });
  if (error) return { ok: false, error: error.message };
  refresh();
  return { ok: true, count: data };
}

/** Unticks a cell: soft-deletes the mark (the audit log keeps the history). */
export async function unmarkAdvice(markId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  if (!z.uuid().safeParse(markId).success) return { ok: false, error: "Unknown mark." };
  const { error, count } = await supabase
    .from("advice_marks")
    .update({ deleted_at: new Date().toISOString() }, { count: "exact" })
    .eq("id", markId)
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: "That mark was already removed. Refresh the page." };
  refresh();
  return { ok: true };
}

/** Changes the advice date of an existing mark. Who ticked it stays the same. */
export async function changeAdviceDate(markId: string, advisedOn: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  if (!z.uuid().safeParse(markId).success) return { ok: false, error: "Unknown mark." };
  const parsed = isoDate.safeParse(advisedOn);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { error, count } = await supabase
    .from("advice_marks")
    .update({ advised_on: parsed.data }, { count: "exact" })
    .eq("id", markId)
    .is("deleted_at", null);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: "That mark was removed. Refresh the page." };
  refresh();
  return { ok: true };
}
