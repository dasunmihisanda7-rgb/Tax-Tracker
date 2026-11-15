"use client";

import { Button } from "@/components/ui/button";

/** Shown when a screen fails to load (for example, the database could not be reached). */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid max-w-lg gap-3 rounded-lg border border-destructive/40 p-6">
      <h1 className="text-lg font-semibold">Something went wrong loading this screen</h1>
      <p className="text-sm text-muted-foreground">
        Nothing was saved or lost. Try again; if it keeps happening, note the reference below.
      </p>
      {error.digest && <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>}
      <div>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
