import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/app-shell/sidebar";
import { createClient } from "@/lib/supabase/server";

/**
 * Layout for every signed-in screen. The proxy already redirects signed-out
 * requests; this server-side getUser() check is the second guard.
 * The session read sits behind Suspense, as Cache Components requires.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<div className="flex-1" aria-busy="true" />}>
      <AuthedShell>{children}</AuthedShell>
    </Suspense>
  );
}

async function AuthedShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  // A cookie the proxy accepted but Supabase rejects (revoked or expired session):
  // clear it first, otherwise /login would bounce straight back here.
  if (!data.user) redirect("/auth/signout");

  return (
    <div className="flex flex-1">
      <Sidebar email={data.user.email ?? ""} />
      <main className="min-w-0 flex-1 p-8">{children}</main>
    </div>
  );
}
