"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIn } from "@/lib/auth/actions";
import { InviteLinkHandler } from "./invite-link-handler";

const LINK_ERROR = "That invitation link is invalid or has expired. Ask for a new one.";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, undefined);
  const [inviteError, setInviteError] = useState<string>();
  const linkError = useSearchParams().get("error") === "link" ? LINK_ERROR : undefined;
  const error = state?.error ?? inviteError ?? linkError;

  return (
    <form action={action} className="grid gap-4">
      <InviteLinkHandler onError={setInviteError} />
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
