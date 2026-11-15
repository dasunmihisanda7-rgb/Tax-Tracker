import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Landing point for links in Supabase auth emails (invite, password recovery).
 * Exchanges the token for a session, then sends the user to set a password.
 * Sign-up is not possible here: the token must come from an invitation issued in the dashboard.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && (type === "invite" || type === "recovery")) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL("/auth/set-password", request.url));
    }
  }

  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
