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
  if (error.code === "23505") return "A client with this name already exists.";
  if (error.code === "42501") return "You don't have permission to do that.";
  return error.message;
}
