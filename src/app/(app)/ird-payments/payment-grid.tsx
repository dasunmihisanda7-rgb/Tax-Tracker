"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MoneyBadge } from "@/components/status-badges";
import { cn } from "@/lib/utils";
import { TAX_TYPES, type FundingMethod, type MoneyStatus, type PaidBy, type PaymentMode, type TaxType } from "@/lib/constants";
import { formatAmount, formatDate } from "@/lib/format";
import { ObligationPanel } from "./obligation-panel";

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
export type GridPeriod = { id: string; code: string; label: string; due_date: string };

export function PaymentGrid({
  tab,
  periods,
  rows,
  openKey,
  today,
}: {
  tab: string;
  periods: GridPeriod[];
  rows: GridRow[];
  openKey: string | null;
  today: string;
}) {
  // openKey format: "<client_id>:<tax_type>:<period_id>"
  const [open, setOpen] = useState<string | null>(openKey);

  const groups = useMemo(() => {
    const types = [...new Set(rows.map((r) => r.tax_type))];
    return types.map((t) => ({ taxType: t, rows: rows.filter((r) => r.tax_type === t) }));
  }, [rows]);
  const totals = useMemo(
    () =>
      Object.fromEntries(
        periods.map((p) => [p.id, rows.reduce((s, r) => s + (r.cells[p.id]?.paid ?? 0), 0)]),
      ),
    [periods, rows],
  );
  const heldTotal = rows.reduce(
    (s, r) => s + Object.values(r.cells).reduce((x, c) => x + (c.balance > 0 ? c.balance : 0), 0),
    0,
  );

  const selected = useMemo(() => {
    if (!open) return null;
    const [clientId, taxType, periodId] = open.split(":");
    const row = rows.find((r) => r.client_id === clientId && r.tax_type === taxType);
    const period = periods.find((p) => p.id === periodId);
    if (!row || !period) return null;
    return { row, period, cell: row.cells[period.id] };
  }, [open, rows, periods]);

  return (
    <div className="grid min-w-0 gap-2">
      <div className="max-h-[70vh] overflow-auto rounded-lg border">
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20 bg-background">
            <tr>
              <th className="sticky left-0 z-30 min-w-56 border-r border-b bg-background px-3 py-2 text-left font-medium">
                Client
              </th>
              {periods.map((p) => (
                <th key={p.id} className="min-w-36 border-b px-2 py-2 text-center align-bottom font-normal">
                  <div className="font-mono font-medium">{p.code}</div>
                  <div className="text-xs text-muted-foreground">{p.label}</div>
                  <div className="text-[11px] text-muted-foreground">Due {formatDate(p.due_date)}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => (
              <Fragment key={g.taxType}>
                {tab === "income" && (
                  <tr>
                    <td colSpan={periods.length + 1} className="border-b bg-muted/60 px-3 py-1.5 text-xs font-semibold">
                      <span className="sticky left-3">
                        {g.taxType} · {TAX_TYPES.find((t) => t.code === g.taxType)?.name} ({g.rows.length})
                      </span>
                    </td>
                  </tr>
                )}
                {g.rows.map((row) => (
                  <tr key={row.key} className="group">
                    <td className="sticky left-0 z-10 border-r border-b bg-background px-3 py-1.5 align-top group-hover:bg-muted">
                      <Link href={`/clients/${row.client_id}`} className="font-medium hover:underline">
                        {row.client_name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{row.tax_type}</div>
                    </td>
                    {periods.map((p) => {
                      const cell = row.cells[p.id];
                      const key = `${row.client_id}:${row.tax_type}:${p.id}`;
                      return (
                        <td
                          key={p.id}
                          className={cn(
                            "border-b p-0 align-top",
                            cell?.balance > 0 && "bg-amber-100 dark:bg-amber-950/60",
                            cell?.balance < 0 && "bg-red-50 dark:bg-red-950/40",
                          )}
                          data-cell={`${row.client_name}|${row.tax_type}|${p.code}`}
                          data-status={cell?.status}
                        >
                          <button
                            type="button"
                            onClick={() => setOpen(key)}
                            aria-label={`${row.client_name} ${row.tax_type} ${p.code}: open payments`}
                            className="flex h-full min-h-12 w-full flex-col items-stretch gap-0.5 px-2 py-1.5 text-left hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            {cell?.payments.map((pay) => (
                              <span key={pay.id} className="flex justify-between gap-2 text-xs tabular-nums" data-payment>
                                <span className="text-muted-foreground">{formatDate(pay.paid_on)}</span>
                                <span>
                                  {formatAmount(pay.amount)}
                                  {pay.paid_by === "client_direct" && (
                                    <span className="ml-1 text-[10px] text-muted-foreground">(client)</span>
                                  )}
                                </span>
                              </span>
                            ))}
                            {cell?.balance > 0 && (
                              <span className="text-right text-xs font-medium text-amber-900 dark:text-amber-300" data-held>
                                Held {formatAmount(cell.balance)}
                              </span>
                            )}
                            {cell?.balance < 0 && (
                              <span className="text-right text-xs font-medium text-red-700 dark:text-red-300">
                                Recover {formatAmount(-cell.balance)}
                              </span>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 z-20 bg-muted">
            <tr>
              <td className="sticky left-0 z-30 border-t border-r bg-muted px-3 py-2 text-xs font-medium">
                Total paid (Rs)
                {heldTotal > 0 && (
                  <div className="font-normal text-amber-900 dark:text-amber-300">Held {formatAmount(heldTotal)}</div>
                )}
              </td>
              {periods.map((p) => (
                <td key={p.id} className="border-t px-2 py-2 text-right text-xs font-medium tabular-nums" data-col-total={p.code}>
                  {totals[p.id] ? formatAmount(totals[p.id]) : ""}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>

      <Sheet open={selected !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {selected.row.client_name}
                </SheetTitle>
                <SheetDescription>
                  {selected.row.tax_type} · <span className="font-mono">{selected.period.code}</span>{" "}
                  {selected.period.label} · due {formatDate(selected.period.due_date)}
                </SheetDescription>
                {selected.cell && (
                  <div className="pt-1">
                    <MoneyBadge status={selected.cell.status} balance={selected.cell.balance} />
                  </div>
                )}
              </SheetHeader>
              <ObligationPanel
                key={open}
                clientId={selected.row.client_id}
                taxType={selected.row.tax_type}
                periodId={selected.period.id}
                cell={selected.cell}
                today={today}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
