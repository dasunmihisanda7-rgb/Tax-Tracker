"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SimpleSelect, type Option } from "@/components/simple-select";
import { cn } from "@/lib/utils";

/** Builds the current URL with some query params changed (null or "" removes them). */
export function useUrlParams() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const hrefWith = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v === null || v === "") next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };

  return {
    params,
    hrefWith,
    replace: (changes: Record<string, string | null>) =>
      router.replace(hrefWith(changes), { scroll: false }),
  };
}

/** A select whose value lives in a URL query param. Changing it can also reset other params. */
export function UrlSelect({
  param,
  value,
  options,
  ariaLabel,
  reset = [],
  className,
}: {
  param: string;
  value: string;
  options: Option[];
  ariaLabel: string;
  reset?: string[];
  className?: string;
}) {
  const { replace } = useUrlParams();
  return (
    <SimpleSelect
      ariaLabel={ariaLabel}
      value={value}
      options={options}
      className={className}
      onChange={(v) => replace({ [param]: v, ...Object.fromEntries(reset.map((r) => [r, null])) })}
    />
  );
}

/** Tabs that are links on a URL query param. */
export function UrlTabs({
  param,
  value,
  tabs,
  reset = [],
}: {
  param: string;
  value: string;
  tabs: Option[];
  reset?: string[];
}) {
  const { hrefWith } = useUrlParams();
  return (
    <div role="tablist" className="inline-flex rounded-lg bg-muted p-1">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <Link
            key={t.value}
            role="tab"
            aria-selected={active}
            href={hrefWith({ [param]: t.value, ...Object.fromEntries(reset.map((r) => [r, null])) })}
            replace
            scroll={false}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "bg-background text-foreground shadow-sm",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
