import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { UrlSelect, UrlTabs } from "@/components/url-controls";
import { createClient } from "@/lib/supabase/server";
import { TAX_TYPES } from "@/lib/constants";
import { colomboTodayIso, colomboYear, currentAssessmentYear } from "@/lib/format";
import { AdviceGrid, type AdviceRow, type AdvicePeriod } from "./advice-grid";
import { ADVICE_TABS } from "./tabs";

export default function TaxAdvicePage({ searchParams }: PageProps<"/tax-advice">) {
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        title="Tax Advice"
        description="Who has been sent the tax advice for each period. Tick a box to record it."
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <AdviceScreen searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function AdviceScreen({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const tab = ADVICE_TABS.find((t) => t.value === first(sp.tab)) ?? ADVICE_TABS[0];
  const supabase = await createClient();

  // Years that have periods for this family. Income "2026/27" -> 2026.
  const { data: yearRows } = await supabase
    .from("tax_periods")
    .select("year_key")
    .eq("family", tab.family)
    .is("deleted_at", null);
  const years = [...new Set((yearRows ?? []).map((p) => Number(p.year_key.slice(0, 4))))].sort((a, b) => b - a);
  const preferred = tab.family === "income" ? currentAssessmentYear() : colomboYear();
  const requested = Number(first(sp.year));
  const year = years.includes(requested)
    ? requested
    : years.includes(preferred)
      ? preferred
      : (years[0] ?? preferred);
  const yearKey =
    tab.family === "income" ? `${year}/${String((year + 1) % 100).padStart(2, "0")}` : String(year);

  const [periodsRes, clientsRes] = await Promise.all([
    supabase
      .from("tax_periods")
      .select("id, code, label, due_date")
      .eq("family", tab.family)
      .eq("year_key", yearKey)
      .is("deleted_at", null)
      .order("sort_order"),
    supabase
      .from("client_tax_types")
      .select("client_id, tax_type, clients!inner(name)")
      .in("tax_type", tab.taxTypes)
      .eq("is_active", true)
      .is("deleted_at", null)
      .eq("clients.is_active", true)
      .is("clients.deleted_at", null),
  ]);
  const periods: AdvicePeriod[] = periodsRes.data ?? [];

  const { data: marks } = periods.length
    ? await supabase
        .from("advice_marks")
        .select("id, client_id, tax_type, period_id, advised_on, advised_by, created_at")
        .in("period_id", periods.map((p) => p.id))
        .in("tax_type", tab.taxTypes)
        .is("deleted_at", null)
    : { data: [] };
  const { data: profiles } = await supabase.from("profiles").select("id, full_name");
  const names = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const order = TAX_TYPES.map((t) => t.code);
  const rows: AdviceRow[] = (clientsRes.data ?? [])
    .map((ct) => ({
      key: `${ct.client_id}:${ct.tax_type}`,
      client_id: ct.client_id,
      client_name: ct.clients.name,
      tax_type: ct.tax_type,
      marks: {} as AdviceRow["marks"],
    }))
    .sort(
      (a, b) =>
        order.indexOf(a.tax_type) - order.indexOf(b.tax_type) ||
        a.client_name.localeCompare(b.client_name),
    );
  const byKey = new Map(rows.map((r) => [r.key, r]));
  for (const m of marks ?? []) {
    const row = byKey.get(`${m.client_id}:${m.tax_type}`);
    if (row) {
      row.marks[m.period_id] = {
        id: m.id,
        advised_on: m.advised_on,
        advised_by: m.advised_by ? (names.get(m.advised_by) ?? "Unknown") : "Unknown",
        created_at: m.created_at,
      };
    }
  }

  const notAdvised = first(sp.na);
  const filterPeriod = periods.find((p) => p.code === notAdvised) ?? null;

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <UrlTabs
          param="tab"
          value={tab.value}
          tabs={ADVICE_TABS.map((t) => ({ value: t.value, label: t.label }))}
          reset={["year", "na"]}
        />
        {years.length > 0 && (
          <UrlSelect
            param="year"
            ariaLabel="Year"
            value={String(year)}
            reset={["na"]}
            options={years.map((y) => ({
              value: String(y),
              label: tab.family === "income" ? `${y}/${String((y + 1) % 100).padStart(2, "0")}` : String(y),
            }))}
          />
        )}
        {periods.length > 0 && (
          <UrlSelect
            param="na"
            ariaLabel="Filter"
            value={filterPeriod?.code ?? "all"}
            className="min-w-64"
            options={[
              { value: "all", label: "All clients" },
              ...periods.map((p) => ({ value: p.code, label: `Not advised for ${p.code} ${p.label}` })),
            ]}
          />
        )}
      </div>

      {periods.length === 0 ? (
        <EmptyState>
          No periods exist for {yearKey}. Generate them in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>
          .
        </EmptyState>
      ) : rows.length === 0 ? (
        <EmptyState>
          No active clients pay {tab.taxTypes.join(", ")}.{" "}
          <Link href="/clients" className="underline">
            Add or update clients
          </Link>
          .
        </EmptyState>
      ) : (
        <AdviceGrid
          key={`${tab.value}:${year}`}
          tab={tab.value}
          yearKey={yearKey}
          periods={periods}
          rows={rows}
          filterPeriodId={filterPeriod?.id ?? null}
          wholeYearPeriodIds={
            tab.family === "income" ? periods.filter((p) => !p.code.endsWith("0")).map((p) => p.id) : periods.map((p) => p.id)
          }
          today={colomboTodayIso()}
        />
      )}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed p-10 text-center text-sm">{children}</div>;
}
