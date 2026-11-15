"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { friendlyDbError, requireUser } from "@/lib/auth/require-user";
import type { Json } from "@/lib/supabase/database.types";
import {
  clientSchema,
  parseClientCsv,
  type ClientInput,
  type ImportRow,
} from "./schema";

export type SaveResult = { ok: true; id: string } | { ok: false; error: string; field?: string };

/** Create or update a client and its tax types (atomic, via the save_client function). */
export async function saveClient(input: ClientInput): Promise<SaveResult> {
  const { supabase } = await requireUser();

  const parsed = clientSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: String(issue.path[0] ?? "") };
  }
  const c = parsed.data;

  const { data, error } = await supabase.rpc("save_client", {
    p_id: c.id,
    p_name: c.name,
    p_client_type: c.client_type,
    p_contact_person: c.contact_person,
    p_email: c.email,
    p_phone: c.phone,
    p_tin: c.tin,
    p_notes: c.notes,
    p_is_active: c.is_active,
    p_tax_types: c.tax_types,
  });
  if (error) {
    return {
      ok: false,
      error: friendlyDbError(error),
      field: error.code === "23505" ? "name" : undefined,
    };
  }
  refresh();
  return { ok: true, id: data };
}

/** Soft-deletes a client. The database refuses if the client has any records. */
export async function deleteClient(id: string): Promise<{ error: string } | void> {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("soft_delete_client", { p_id: id });
  if (error) return { error: friendlyDbError(error) };
  redirect("/clients");
}

async function existingClientNames(supabase: Awaited<ReturnType<typeof requireUser>>["supabase"]) {
  const { data, error } = await supabase.from("clients").select("name").is("deleted_at", null);
  if (error) throw new Error(error.message);
  return new Set(data.map((c) => c.name.trim().toLowerCase()));
}

export type ImportPreview = { rows: ImportRow[]; fileErrors: string[] };

/** Validates the CSV text and returns a row-by-row preview. Saves nothing. */
export async function previewImport(text: string): Promise<ImportPreview> {
  const { supabase } = await requireUser();
  return parseClientCsv(text, await existingClientNames(supabase));
}

export type ImportResult = {
  imported: number;
  failed: { line: number; name: string; error: string }[];
  skipped: number;
};

/** Re-validates the CSV on the server and imports only the valid rows. */
export async function runImport(text: string): Promise<ImportResult | { error: string }> {
  const { supabase } = await requireUser();
  const { rows, fileErrors } = parseClientCsv(text, await existingClientNames(supabase));
  if (fileErrors.length) return { error: fileErrors.join(" ") };

  const valid = rows.filter((r) => r.errors.length === 0);
  if (valid.length === 0) return { imported: 0, failed: [], skipped: rows.length };

  const payload = valid.map((r) => ({ name: r.name, client_type: r.client_type, tax_types: r.tax_types }));
  const { data, error } = await supabase.rpc("import_clients", { p_rows: payload as unknown as Json });
  if (error) return { error: friendlyDbError(error) };

  const results = data as { index: number; ok: boolean; error?: string }[];
  const failed = results
    .filter((r) => !r.ok)
    .map((r) => ({ line: valid[r.index].line, name: valid[r.index].name, error: r.error ?? "Failed." }));

  refresh();
  return {
    imported: results.filter((r) => r.ok).length,
    failed,
    skipped: rows.length - valid.length,
  };
}
