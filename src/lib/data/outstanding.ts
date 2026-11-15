import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { TaxType } from "@/lib/constants";

export type OutstandingRow = {
  client_id: string;
  client_name: string;
  client_is_active: boolean | null;
  tax_type: TaxType;
  period_id: string;
  period_code: string;
  period_label: string;
  year_key: string;
  due_date: string;
  received_total: number;
  paid_total: number;
  paid_by_firm_total: number;
  balance: number;
  first_received_on: string | null;
  last_paid_on: string | null;
};

/** Payment pending (oldest money first) and to recover (by client), from obligation_status. */
export async function loadOutstanding() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("obligation_status")
    .select(
      "client_id, client_name, client_is_active, tax_type, period_id, period_code, period_label, year_key, due_date, received_total, paid_total, paid_by_firm_total, balance, money_status, first_received_on, last_paid_on",
    )
    .in("money_status", ["payment_pending", "to_recover"]);

  const all = (data ?? []).map((o) => ({
    ...o,
    received_total: Number(o.received_total),
    paid_total: Number(o.paid_total),
    paid_by_firm_total: Number(o.paid_by_firm_total),
    balance: Number(o.balance),
  })) as (OutstandingRow & { money_status: string })[];

  const pending = all
    .filter((o) => o.money_status === "payment_pending")
    .sort(
      (a, b) =>
        (a.first_received_on ?? "").localeCompare(b.first_received_on ?? "") ||
        a.due_date.localeCompare(b.due_date) ||
        a.client_name.localeCompare(b.client_name),
    );
  const recover = all
    .filter((o) => o.money_status === "to_recover")
    .sort((a, b) => a.client_name.localeCompare(b.client_name) || a.due_date.localeCompare(b.due_date));

  const recoverByClient = [...new Set(recover.map((r) => r.client_id))].map((id) => {
    const items = recover.filter((r) => r.client_id === id);
    return { id, name: items[0].client_name, items, total: items.reduce((s, o) => s - o.balance, 0) };
  });

  return {
    pending,
    recover,
    recoverByClient,
    pendingTotal: pending.reduce((s, o) => s + o.balance, 0),
    recoverTotal: recover.reduce((s, o) => s - o.balance, 0),
    error: error?.message ?? null,
  };
}
