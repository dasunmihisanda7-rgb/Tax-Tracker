"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

/**
 * Handles Supabase's default invite / password-recovery email link.
 *
 * That link verifies the token on Supabase, then redirects to the Site URL with
 * the session in the URL fragment (#access_token=…&refresh_token=…&type=invite).
 * The fragment never reaches the server, and the proxy sends signed-out visitors
 * to /login (browsers keep the fragment across that redirect), so we pick it up here,
 * store the session in cookies, and send the user on to set a password.
 *
 * Only invite and recovery links are accepted. This is not a sign-up path:
 * the tokens can only come from an invitation issued in the Supabase dashboard.
 */
export function InviteLinkHandler({ onError }: { onError: (message: string) => void }) {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    // Strip the tokens from the address bar and browser history straight away.
    window.history.replaceState(null, "", window.location.pathname + window.location.search);

    if (params.get("error") || params.get("error_code")) {
      onError("That invitation link is invalid or has expired. Ask for a new one.");
      return;
    }

    const type = params.get("type");
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken || (type !== "invite" && type !== "recovery")) return;

    const supabase = createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { detectSessionInUrl: false },
    });
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          onError("That invitation link is invalid or has expired. Ask for a new one.");
        } else {
          router.replace("/auth/set-password");
        }
      });
  }, [onError, router]);

  return null;
}
