"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/simple-select";
import { TAX_TYPES } from "@/lib/constants";

const TAX_OPTIONS = [
  { value: "all", label: "All tax types" },
  ...TAX_TYPES.map((t) => ({ value: t.code, label: t.code })),
];
const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "all", label: "Active and inactive" },
];

/** Search box and filters for the clients list. State lives in the URL. */
export function ClientFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const setParam = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === fallback) next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  // Debounce typing in the search box.
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q.trim() === current) return;
    const t = setTimeout(() => setParam("q", q.trim(), ""), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, contact or TIN"
          aria-label="Search clients"
          className="pl-8"
        />
      </div>
      <SimpleSelect
        ariaLabel="Tax type"
        value={params.get("tax") ?? "all"}
        onChange={(v) => setParam("tax", v, "all")}
        options={TAX_OPTIONS}
      />
      <SimpleSelect
        ariaLabel="Status"
        value={params.get("status") ?? "active"}
        onChange={(v) => setParam("status", v, "active")}
        options={STATUS_OPTIONS}
      />
    </div>
  );
}
