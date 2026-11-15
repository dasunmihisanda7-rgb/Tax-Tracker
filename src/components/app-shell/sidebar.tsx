import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/lib/auth/actions";
import { NavLinks } from "./nav-links";

export function Sidebar({ email }: { email: string }) {
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r bg-sidebar p-4">
      <div className="px-3 pb-4">
        <p className="text-sm font-semibold">Tax Tracker</p>
        <p className="text-xs text-muted-foreground">Vidhana &amp; Co.</p>
      </div>
      <NavLinks />
      <div className="mt-auto grid gap-3">
        <Separator />
        <p className="truncate px-3 text-xs text-muted-foreground" title={email}>
          {email}
        </p>
        <form action={signOut}>
          <Button type="submit" variant="ghost" className="w-full justify-start gap-2">
            <LogOut className="size-4" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
