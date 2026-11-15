"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/date-picker";
import { OptionCombobox } from "@/components/option-combobox";
import { SimpleSelect, type Option } from "@/components/simple-select";
import { useUrlParams } from "@/components/url-controls";
import { TAX_TYPES, taxFamily, yearKeys, type PeriodFamily, type TaxType } from "@/lib/constants";

export type FilterPeriod = { id: string; family: PeriodFamily; code: string; label: string; year_key: string };

const ALL = "all";

/**
 * Filter bar shared by Client Receipts and the IRD payments list:
 * client, tax type, year, period code, two "kind" selects (funding method / payment mode,
 * or paid by), date range and a reference-number search. Everything lives in the URL.
 */
export function EntryFilters({
  clients,
  periods,
  years,
  extraSelects,
  basePath,
}: {
  clients: Option[];
  periods: FilterPeriod[];
  years: number[];
  extraSelects: { param: string; label: string; options: Option[] }[];
  basePath: string;
}) {
  const { params, replace } = useUrlParams();
  const get = (k: string) => params.get(k) ?? "";
  const [ref, setRef] = useState(get("ref"));

  useEffect(() => {
    if (ref.trim() === get("ref")) return;
    const t = setTimeout(() => replace({ ref: ref.trim() || null }), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref]);

  const tax = get("tax") as TaxType | "";
  const year = Number(get("year")) || null;
  const keys = year ? yearKeys(year) : null;
  const periodOptions: Option[] = keys
    ? periods
        .filter((p) => p.year_key === keys.income || p.year_key === keys.monthly)
        .filter((p) => !tax || p.family === taxFamily(tax))
        .map((p) => ({
          value: p.id,
          label: `${p.code} · ${p.label}${tax ? "" : p.family === "income" ? " (income)" : " (monthly)"}`,
        }))
    : [];

  const anyFilter = [...params.keys()].some((k) => k !== "view");

  return (
    <div className="grid gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-64">
          <OptionCombobox
            ariaLabel="Client"
            value={get("client") || null}
            onChange={(v) => replace({ client: v })}
            options={clients}
            placeholder="All clients"
            showClear
          />
        </div>
        <SimpleSelect
          ariaLabel="Tax type"
          value={tax || ALL}
          onChange={(v) => replace({ tax: v === ALL ? null : v, period: null })}
          options={[{ value: ALL, label: "All tax types" }, ...TAX_TYPES.map((t) => ({ value: t.code, label: t.code }))]}
          className="min-w-36"
        />
        <SimpleSelect
          ariaLabel="Year"
          value={year ? String(year) : ALL}
          onChange={(v) => replace({ year: v === ALL ? null : v, period: null })}
          options={[
            { value: ALL, label: "All years" },
            ...years.map((y) => ({ value: String(y), label: `${yearKeys(y).income} · ${y}` })),
          ]}
          className="min-w-36"
        />
        <SimpleSelect
          ariaLabel="Period code"
          value={get("period") || ALL}
          onChange={(v) => replace({ period: v === ALL ? null : v })}
          options={[{ value: ALL, label: year ? "All periods" : "Pick a year for periods" }, ...periodOptions]}
          className="min-w-52"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {extraSelects.map((s) => (
          <SimpleSelect
            key={s.param}
            ariaLabel={s.label}
            value={get(s.param) || ALL}
            onChange={(v) => replace({ [s.param]: v === ALL ? null : v })}
            options={[{ value: ALL, label: `Any ${s.label.toLowerCase()}` }, ...s.options]}
            className="min-w-44"
          />
        ))}
        <div className="flex items-center gap-1">
          <DatePicker
            ariaLabel="From date"
            value={get("from") || null}
            onChange={(d) => replace({ from: d })}
            placeholder="From date"
            max={get("to") || undefined}
            className="w-36"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <DatePicker
            ariaLabel="To date"
            value={get("to") || null}
            onChange={(d) => replace({ to: d })}
            placeholder="To date"
            min={get("from") || undefined}
            className="w-36"
          />
        </div>
        <div className="relative w-56">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Reference number"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="Reference number"
            className="pl-8"
          />
        </div>
        {anyFilter && (
          <Link href={basePath} className={buttonVariants({ variant: "ghost", size: "sm" })} onClick={() => setRef("")}>
            <X className="size-4" />
            Clear filters
          </Link>
        )}
      </div>
    </div>
  );
}
