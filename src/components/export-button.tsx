"use client";

import { useSearchParams } from "next/navigation";
import { FileSpreadsheet } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

/** "Export to Excel": downloads /export/<kind> with the screen's current filters. */
export function ExportButton({ kind, extra }: { kind: string; extra?: Record<string, string> }) {
  const params = useSearchParams();
  const qs = new URLSearchParams(params.toString());
  for (const [k, v] of Object.entries(extra ?? {})) qs.set(k, v);
  qs.delete("open");
  const href = `/export/${kind}${qs.size ? `?${qs.toString()}` : ""}`;
  return (
    <a href={href} download className={buttonVariants({ variant: "outline" })} data-export={kind}>
      <FileSpreadsheet className="size-4" />
      Export to Excel
    </a>
  );
}
