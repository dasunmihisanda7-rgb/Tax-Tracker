import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * For Server Actions: re-checks the signed-in user (never trust the client)
 * and returns a Supabase client bound to that user's session.
 */
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
}

/** Turns a Supabase/Postgres error into a message staff can act on. */
export function friendlyDbError(error: { code?: string; message: string }): string {
  const m = error.message;
  if (error.code === "23505" && m.includes("clients_name_unique_live")) {
    return "A client with this name already exists.";
  }
  if (error.code === "23514" && m.includes("ref_no_required")) {
    return "Enter the reference number for cheques and online transfers.";
  }
  if (error.code === "23514" && m.includes("amount")) return "The amount must be above zero.";
  if (error.code === "23503" && m.includes("period_family")) {
    return "That period doesn't belong to this tax type.";
  }
  if (error.code === "23503" && m.includes("client_tax")) {
    return "The client isn't registered for that tax type. Tick it on the client first.";
  }
  if (error.code === "42501") return "You don't have permission to do that.";
  return m;
}
