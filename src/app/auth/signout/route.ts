import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Clears this browser's Supabase session and goes to /login.
 *
 * Used when a session cookie is still present but Supabase no longer accepts it
 * (for example the session was revoked or expired). Without this, the proxy would
 * keep treating the stale token as signed in and bounce between /login and the app.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  // Local scope: only this browser. Errors are ignored; the session may already be gone.
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);

  // Make sure every Supabase auth cookie is removed, whatever signOut managed to do.
  const store = await cookies();
  const response = NextResponse.redirect(new URL("/login", request.url));
  for (const c of store.getAll()) {
    if (c.name.startsWith("sb-")) response.cookies.set(c.name, "", { path: "/", maxAge: 0 });
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}
