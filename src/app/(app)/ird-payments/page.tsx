import { Suspense } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { UrlSelect, UrlTabs } from "@/components/url-controls";
import { createClient } from "@/lib/supabase/server";
import { TAX_TYPES, type MoneyStatus } from "@/lib/constants";
import { colomboTodayIso, colomboYear, currentAssessmentYear } from "@/lib/format";
import { ADVICE_TABS } from "../tax-advice/tabs";
import { PaymentGrid, type GridCell, type GridRow } from "./payment-grid";
import { PaymentsList } from "./payments-list";

export default function IrdPaymentsPage({ searchParams }: PageProps<"/ird-payments">) {
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        title="IRD Payments"
        description="Payments made to the Inland Revenue Department, in the layout of the old workbooks."
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <PaymentsScreen searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function PaymentsScreen({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
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

async function GridView({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const tab = ADVICE_TABS.find((t) => t.value === first(sp.tab)) ?? ADVICE_TABS[0];
  const supabase = await createClient();

  const { data: yearRows } = await supabase
    .from("tax_periods")
    .select("year_key")
    .eq("family", tab.family)
    .is("deleted_at", null);
  const years = [...new Set((yearRows ?? []).map((p) => Number(p.year_key.slice(0, 4))))].sort((a, b) => b - a);
  const preferred = tab.family === "income" ? currentAssessmentYear() : colomboYear();
  const requested = Number(first(sp.year));
  const year = years.includes(requested) ? requested : years.includes(preferred) ? preferred : (years[0] ?? preferred);
  const yearKey = tab.family === "income" ? `${year}/${String((year + 1) % 100).padStart(2, "0")}` : String(year);

  const { data: periods } = await supabase
    .from("tax_periods")
    .select("id, code, label, due_date")
    .eq("family", tab.family)
    .eq("year_key", yearKey)
    .is("deleted_at", null)
    .order("sort_order");
  const periodIds = (periods ?? []).map((p) => p.id);

  const [statusRes, paymentsRes, receiptsRes] = periodIds.length
    ? await Promise.all([
        supabase
          .from("obligation_status")
          .select("client_id, client_name, tax_type, period_id, received_total, paid_total, balance, money_status")
          .in("tax_type", tab.taxTypes)
          .in("period_id", periodIds)
          .eq("client_is_active", true),
        supabase
          .from("ird_payments")
          .select(
            "id, client_id, tax_type, period_id, paid_on, amount, paid_by, ref_no, note, created_at, profiles!ird_payments_created_by_fkey(full_name)",
          )
          .in("tax_type", tab.taxTypes)
          .in("period_id", periodIds)
          .is("deleted_at", null)
          .order("paid_on")
          .order("created_at"),
        supabase
          .from("client_receipts")
          .select(
            "id, client_id, tax_type, period_id, received_on, funding_method, payment_mode, ref_no, amount, profiles!client_receipts_created_by_fkey(full_name)",
          )
          .in("tax_type", tab.taxTypes)
          .in("period_id", periodIds)
          .is("deleted_at", null)
          .order("received_on"),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const order = TAX_TYPES.map((t) => t.code);
  const rowsByKey = new Map<string, GridRow>();
  for (const s of statusRes.data ?? []) {
    const key = `${s.client_id}:${s.tax_type}`;
    let row = rowsByKey.get(key);
    if (!row) {
      row = { key, client_id: s.client_id!, client_name: s.client_name!, tax_type: s.tax_type!, cells: {} };
      rowsByKey.set(key, row);
    }
    row.cells[s.period_id!] = {
      received: Number(s.received_total ?? 0),
      paid: Number(s.paid_total ?? 0),
      balance: Number(s.balance ?? 0),
      status: (s.money_status ?? "no_activity") as MoneyStatus,
      payments: [],
      receipts: [],
    } satisfies GridCell;
  }
  for (const p of paymentsRes.data ?? []) {
    rowsByKey.get(`${p.client_id}:${p.tax_type}`)?.cells[p.period_id]?.payments.push({
      id: p.id,
      paid_on: p.paid_on,
      amount: Number(p.amount),
      paid_by: p.paid_by,
      ref_no: p.ref_no,
      note: p.note,
      entered_by: p.profiles?.full_name ?? "",
    });
  }
  for (const r of receiptsRes.data ?? []) {
    rowsByKey.get(`${r.client_id}:${r.tax_type}`)?.cells[r.period_id]?.receipts.push({
      id: r.id,
      received_on: r.received_on,
      funding_method: r.funding_method,
      payment_mode: r.payment_mode,
      ref_no: r.ref_no,
      amount: Number(r.amount),
      entered_by: r.profiles?.full_name ?? "",
    });
  }
  const rows = [...rowsByKey.values()].sort(
    (a, b) => order.indexOf(a.tax_type) - order.indexOf(b.tax_type) || a.client_name.localeCompare(b.client_name),
  );

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
            options={years.map((y) => ({
              value: String(y),
              label: tab.family === "income" ? `${y}/${String((y + 1) % 100).padStart(2, "0")}` : String(y),
            }))}
          />
        )}
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block size-3 rounded-sm bg-amber-200 dark:bg-amber-900" /> money held, IRD payment
          not made
          <span className="ml-2 inline-block size-3 rounded-sm bg-red-200 dark:bg-red-900" /> firm paid, to recover
        </span>
      </div>

      {(periods ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm">
          No periods exist for {yearKey}. Generate them in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>
          .
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm">
          No active clients pay {tab.taxTypes.join(", ")}.
        </div>
      ) : (
        <PaymentGrid
          key={`${tab.value}:${year}`}
          tab={tab.value}
          periods={periods ?? []}
          rows={rows}
          openKey={first(sp.open) || null}
          today={colomboTodayIso()}
        />
      )}
    </div>
  );
}
