/** Temporary page body for screens that later phases will build. */
export function Placeholder({ title, phase }: { title: string; phase?: number }) {
  return (
    <div className="grid gap-2">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">
        {phase ? `Coming in Phase ${phase}.` : "Coming in a later phase."}
      </p>
    </div>
  );
}
