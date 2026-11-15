import "server-only";
import { createClient } from "@/lib/supabase/server";
import {
  TAX_TYPES,
  type FundingMethod,
  type MoneyStatus,
  type PaidBy,
  type PaymentMode,
  type PeriodFamily,
  type TaxType,
} from "@/lib/constants";
import { colomboYear, currentAssessmentYear } from "@/lib/format";
import { ADVICE_TABS } from "@/app/(app)/tax-advice/tabs";
import { first, incomeYearKey, type SearchParams } from "./params";

export type GridPeriod = { id: string; code: string; label: string; due_date: string };

/** Resolves the tab (Income tax / WHT / APIT) and year shown by the Tax Advice and IRD Payments grids. */
async function resolveTabAndYear(sp: SearchParams) {
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
  const yearKey = tab.family === "income" ? incomeYearKey(year) : String(year);
  const { data: periods } = await supabase
    .from("tax_periods")
    .select("id, code, label, due_date")
    .eq("family", tab.family)
    .eq("year_key", yearKey)
    .is("deleted_at", null)
    .order("sort_order");
  return { supabase, tab, years, year, yearKey, periods: (periods ?? []) as GridPeriod[] };
}

const typeOrder = TAX_TYPES.map((t) => t.code);
const byTypeThenName = (a: { tax_type: TaxType; client_name: string }, b: { tax_type: TaxType; client_name: string }) =>
  typeOrder.indexOf(a.tax_type) - typeOrder.indexOf(b.tax_type) || a.client_name.localeCompare(b.client_name);

// ---------------------------------------------------------------------------
// Tax Advice grid
// ---------------------------------------------------------------------------

export type AdviceMark = { id: string; advised_on: string; advised_by: string; created_at: string };
export type AdviceRow = {
  key: string;
  client_id: string;
  client_name: string;
  tax_type: TaxType;
  marks: Record<string, AdviceMark>;
};

export async function loadAdviceGrid(sp: SearchParams) {
  const { supabase, tab, years, year, yearKey, periods } = await resolveTabAndYear(sp);
  const periodIds = periods.map((p) => p.id);

  const [clientsRes, marksRes, profilesRes] = await Promise.all([
    supabase
      .from("client_tax_types")
      .select("client_id, tax_type, clients!inner(name)")
      .in("tax_type", tab.taxTypes)
      .eq("is_active", true)
      .is("deleted_at", null)
      .eq("clients.is_active", true)
      .is("clients.deleted_at", null),
    periodIds.length
      ? supabase
          .from("advice_marks")
          .select("id, client_id, tax_type, period_id, advised_on, advised_by, created_at")
          .in("period_id", periodIds)
          .in("tax_type", tab.taxTypes)
          .is("deleted_at", null)
      : Promise.resolve({ data: [] as never[] }),
    supabase.from("profiles").select("id, full_name"),
  ]);
  const names = new Map((profilesRes.data ?? []).map((p) => [p.id, p.full_name]));

  const rows: AdviceRow[] = (clientsRes.data ?? [])
    .map((ct) => ({
      key: `${ct.client_id}:${ct.tax_type}`,
      client_id: ct.client_id,
      client_name: ct.clients.name,
      tax_type: ct.tax_type,
      marks: {} as AdviceRow["marks"],
    }))
    .sort(byTypeThenName);
  const byKey = new Map(rows.map((r) => [r.key, r]));
  for (const m of marksRes.data ?? []) {
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

  const filterPeriod = periods.find((p) => p.code === first(sp.na)) ?? null;
  return { tab, years, year, yearKey, periods, rows, filterPeriod };
}

// ---------------------------------------------------------------------------
// IRD Payments grid
// ---------------------------------------------------------------------------

export type GridPayment = {
  id: string;
  paid_on: string;
  amount: number;
  paid_by: PaidBy;
  ref_no: string | null;
  note: string | null;
  entered_by: string;
};
export type GridReceipt = {
  id: string;
  received_on: string;
  funding_method: FundingMethod;
  payment_mode: PaymentMode;
  ref_no: string | null;
  amount: number;
  entered_by: string;
};
export type GridCell = {
  received: number;
  paid: number;
  balance: number;
  status: MoneyStatus;
  payments: GridPayment[];
  receipts: GridReceipt[];
};
export type GridRow = {
  key: string;
  client_id: string;
  client_name: string;
  tax_type: TaxType;
  cells: Record<string, GridCell>;
};

export async function loadIrdGrid(sp: SearchParams) {
  const { supabase, tab, years, year, yearKey, periods } = await resolveTabAndYear(sp);
  const periodIds = periods.map((p) => p.id);
  if (!periodIds.length) return { tab, years, year, yearKey, periods, rows: [] as GridRow[] };

  const [statusRes, paymentsRes, receiptsRes] = await Promise.all([
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
  ]);

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
    };
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
  const rows = [...rowsByKey.values()].sort(byTypeThenName);
  return { tab, years, year, yearKey, periods, rows };
}

export type GridTab = { value: string; label: string; taxTypes: TaxType[]; family: PeriodFamily };
