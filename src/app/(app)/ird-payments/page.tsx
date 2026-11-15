import { Suspense } from "react";
import Link from "next/link";
import { ExportButton } from "@/components/export-button";
import { PageHeader } from "@/components/page-header";
import { GridSkeleton } from "@/components/skeletons";
import { UrlSelect, UrlTabs } from "@/components/url-controls";
import { loadIrdGrid } from "@/lib/data/grids";
import { first, incomeYearKey, type SearchParams } from "@/lib/data/params";
import { colomboTodayIso } from "@/lib/format";
import { ADVICE_TABS } from "../tax-advice/tabs";
import { PaymentGrid } from "./payment-grid";
import { PaymentsList } from "./payments-list";

export default function IrdPaymentsPage({ searchParams }: PageProps<"/ird-payments">) {
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        title="IRD Payments"
        description="Payments made to the Inland Revenue Department, in the layout of the old workbooks."
        actions={
          <Suspense>
            <IrdExportButton searchParams={searchParams} />
          </Suspense>
        }
      />
      <Suspense fallback={<GridSkeleton />}>
        <PaymentsScreen searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function IrdExportButton({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  return <ExportButton kind={first(sp.view) === "list" ? "payments" : "ird-grid"} />;
}

async function PaymentsScreen({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const view = first(sp.view) === "list" ? "list" : "grid";

  return (
    <div className="grid min-w-0 gap-4">
      <UrlTabs
        param="view"
        value={view}
        tabs={[
          { value: "grid", label: "Grid" },
          { value: "list", label: "List" },
        ]}
        reset={["tab", "year", "open", "client", "tax", "period", "paid_by", "from", "to", "ref"]}
      />
      {view === "list" ? <PaymentsList sp={sp} /> : <GridView sp={sp} />}
    </div>
  );
}

async function GridView({ sp }: { sp: SearchParams }) {
  const { tab, years, year, yearKey, periods, rows } = await loadIrdGrid(sp);

  return (
    <div className="grid min-w-0 gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <UrlTabs
          param="tab"
          value={tab.value}
          tabs={ADVICE_TABS.map((t) => ({ value: t.value, label: t.label }))}
          reset={["year", "open"]}
        />
        {years.length > 0 && (
          <UrlSelect
            param="year"
            ariaLabel="Year"
            value={String(year)}
            reset={["open"]}
            options={years.map((y) => ({ value: String(y), label: tab.family === "income" ? incomeYearKey(y) : String(y) }))}
          />
        )}
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block size-3 rounded-sm bg-amber-200 dark:bg-amber-900" /> money held, IRD payment
          not made
          <span className="ml-2 inline-block size-3 rounded-sm bg-red-200 dark:bg-red-900" /> firm paid, to recover
        </span>
      </div>

      {periods.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm">
          No periods exist for {yearKey}. Generate them in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>
          .
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm">
          No active clients pay {tab.taxTypes.join(", ")}.{" "}
          <Link href="/clients" className="underline">
            Add or update clients
          </Link>
          .
        </div>
      ) : (
        <PaymentGrid
          key={`${tab.value}:${year}`}
          tab={tab.value}
          periods={periods}
          rows={rows}
          openKey={first(sp.open) || null}
          today={colomboTodayIso()}
        />
      )}
    </div>
  );
}
