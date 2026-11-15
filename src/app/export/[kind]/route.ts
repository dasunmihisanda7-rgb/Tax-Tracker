import { type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildExport, EXPORT_KINDS, type ExportKind } from "@/lib/exports";
import { fromUrlSearchParams } from "@/lib/data/params";
import { xlsxResponse } from "@/lib/excel";

/**
 * GET /export/<kind>?<the screen's own query params> -> .xlsx download.
 * Signed-in staff only (the proxy also redirects signed-out requests).
 */
export async function GET(request: NextRequest, ctx: RouteContext<"/export/[kind]">) {
  const { kind } = await ctx.params;
  if (!EXPORT_KINDS.includes(kind as ExportKind)) return new Response("Unknown export", { status: 404 });

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return new Response("Sign in required", { status: 401 });

  const result = await buildExport(kind as ExportKind, fromUrlSearchParams(request.nextUrl.searchParams));
  if (!result) return new Response("Not found", { status: 404 });
  return xlsxResponse(result.wb, result.filename);
}
