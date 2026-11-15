"use client";

import { usePathname, useRouter } from "next/navigation";
import { SimpleSelect } from "@/components/simple-select";
import { yearKeys } from "@/lib/constants";

/** Year picker: "2026" means income tax 2026/27 and WHT/APIT calendar 2026. */
export function YearSelect({ years, value }: { years: number[]; value: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const options = years.map((y) => ({
    value: String(y),
    label: `${yearKeys(y).income} · ${y}`,
  }));
  return (
    <SimpleSelect
      ariaLabel="Year"
      value={String(value)}
      onChange={(v) => router.replace(`${pathname}?year=${v}`, { scroll: false })}
      options={options}
    />
  );
}
