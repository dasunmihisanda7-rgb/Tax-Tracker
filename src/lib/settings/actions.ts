"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { friendlyDbError, requireUser } from "@/lib/auth/require-user";

/** Runs generate_periods(year): the five income codes for year/year+1 and the twelve monthly codes for year. */
export async function generatePeriods(year: number): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  const { supabase } = await requireUser();
  if (!Number.isInteger(year) || year < 2000 || year > 2098) return { ok: false, error: "Choose a year between 2000 and 2098." };
  const { data, error } = await supabase.rpc("generate_periods", { p_year: year });
  if (error) return { ok: false, error: friendlyDbError(error) };
  refresh();
  return { ok: true, added: data };
}

/** Changes a period's due date (defaults come from the rules in PLAN.md section 3). */
export async function updateDueDate(periodId: string, dueDate: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase } = await requireUser();
  if (!z.uuid().safeParse(periodId).success) return { ok: false, error: "Unknown period." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return { ok: false, error: "Pick a date." };
  const { error, count } = await supabase
    .from("tax_periods")
    .update({ due_date: dueDate }, { count: "exact" })
    .eq("id", periodId)
    .is("deleted_at", null);
  if (error) return { ok: false, error: friendlyDbError(error) };
  if (!count) return { ok: false, error: "That period no longer exists." };
  refresh();
  return { ok: true };
}
