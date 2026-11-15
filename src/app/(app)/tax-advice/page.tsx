import { Suspense } from "react";
import Link from "next/link";
import { ExportButton } from "@/components/export-button";
import { PageHeader } from "@/components/page-header";
import { GridSkeleton } from "@/components/skeletons";
import { UrlSelect, UrlTabs } from "@/components/url-controls";
import { loadAdviceGrid } from "@/lib/data/grids";
import { incomeYearKey, type SearchParams } from "@/lib/data/params";
import { colomboTodayIso } from "@/lib/format";
import { AdviceGrid } from "./advice-grid";
import { ADVICE_TABS } from "./tabs";

export default function TaxAdvicePage({ searchParams }: PageProps<"/tax-advice">) {
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        title="Tax Advice"
        description="Who has been sent the tax advice for each period. Tick a box to record it."
        actions={
          <Suspense>
            <ExportButton kind="advice" />
          </Suspense>
        }
      />
      <Suspense fallback={<GridSkeleton />}>
        <AdviceScreen searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function AdviceScreen({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { tab, years, year, yearKey, periods, rows, filterPeriod } = await loadAdviceGrid(await searchParams);

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
            options={years.map((y) => ({ value: String(y), label: tab.family === "income" ? incomeYearKey(y) : String(y) }))}
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
