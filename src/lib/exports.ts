import "server-only";
import type ExcelJS from "exceljs";
import {
  TAX_TYPES,
  clientTypeLabel,
  fundingLabel,
  paidByLabel,
  paymentModeLabel,
  type MoneyStatus,
} from "@/lib/constants";
import { colomboTodayIso, formatDate } from "@/lib/format";
import { loadClients, loadClientYear } from "@/lib/data/clients";
import { loadPayments, loadReceipts } from "@/lib/data/entries";
import { loadAdviceGrid, loadIrdGrid } from "@/lib/data/grids";
import { loadOutstanding } from "@/lib/data/outstanding";
import { first, type SearchParams } from "@/lib/data/params";
import { addTableSheet, DATE_FMT, excelDate, MONEY_FMT, newWorkbook } from "@/lib/excel";

const MONEY_STATUS_LABEL: Record<MoneyStatus, string> = {
  no_activity: "No activity",
  payment_pending: "Payment pending",
  to_recover: "To recover",
  settled: "Settled",
};

type ExportResult = { wb: ExcelJS.Workbook; filename: string } | null;
const stamp = () => colomboTodayIso();

export const EXPORT_KINDS = ["clients", "client", "advice", "receipts", "ird-grid", "payments", "outstanding"] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

/** Builds the workbook for one screen, using the same loaders (and filters) as the screen itself. */
export async function buildExport(kind: ExportKind, sp: SearchParams): Promise<ExportResult> {
  switch (kind) {
    case "clients":
      return exportClients(sp);
    case "client":
      return exportClient(sp);
    case "advice":
      return exportAdvice(sp);
    case "receipts":
      return exportReceipts(sp);
    case "ird-grid":
      return exportIrdGrid(sp);
    case "payments":
      return exportPayments(sp);
    case "outstanding":
      return exportOutstanding();
  }
}

async function exportClients(sp: SearchParams): Promise<ExportResult> {
  const { clients } = await loadClients(sp);
  const wb = newWorkbook();
  addTableSheet(wb, {
    name: "Clients",
    title: "Clients",
    subtitle: `Exported ${formatDate(stamp())} · ${clients.length} clients`,
    cols: [
      { header: "Name", key: "name", width: 36 },
      { header: "Client type", key: "type", width: 14 },
      { header: "Tax types", key: "taxTypes", width: 18 },
      { header: "Contact person", key: "contact_person", width: 22 },
      { header: "Email", key: "email", width: 26 },
      { header: "Phone", key: "phone", width: 16 },
      { header: "TIN", key: "tin", width: 16 },
      { header: "Status", key: "status", width: 10 },
      { header: "Notes", key: "notes", width: 40 },
    ],
    rows: clients.map((c) => ({
      ...c,
      type: clientTypeLabel(c.client_type),
      taxTypes: c.taxTypes.join(", "),
      status: c.is_active ? "Active" : "Inactive",
    })),
  });
  return { wb, filename: `clients-${stamp()}.xlsx` };
}

async function exportClient(sp: SearchParams): Promise<ExportResult> {
  const id = first(sp.id);
  const data = await loadClientYear(id, sp);
  if (!data) return null;
  const { client, obligations, names, keys } = data;
  const rows = obligations.map((o) => ({
    tax_type: o.tax_type,
    code: o.period_code,
    label: o.period_label,
    year_key: o.year_key,
    due: o.due_date,
    advised: o.is_advised ? "Advised" : "Not advised",
    advised_on: o.advised_on,
    advised_by: o.advised_by ? names.get(o.advised_by) : "",
    received: Number(o.received_total),
    paid: Number(o.paid_total),
    balance: Number(o.balance),
    status: MONEY_STATUS_LABEL[(o.money_status ?? "no_activity") as MoneyStatus],
  }));
  const order = TAX_TYPES.map((t) => t.code);
  rows.sort((a, b) => order.indexOf(a.tax_type!) - order.indexOf(b.tax_type!));
  const wb = newWorkbook();
  addTableSheet(wb, {
    name: "Obligations",
    title: `${client.name}: obligations ${keys.income} and ${keys.monthly}`,
    subtitle: `${clientTypeLabel(client.client_type)} · exported ${formatDate(stamp())}`,
    cols: [
      { header: "Tax type", key: "tax_type", width: 9 },
      { header: "Code", key: "code", width: 8 },
      { header: "Period", key: "label", width: 18 },
      { header: "Year", key: "year_key", width: 9 },
      { header: "Due", key: "due", type: "date" },
      { header: "Advice", key: "advised", width: 12 },
      { header: "Advised on", key: "advised_on", type: "date" },
      { header: "Advised by", key: "advised_by", width: 16 },
      { header: "Received (Rs)", key: "received", type: "money" },
      { header: "Paid to IRD (Rs)", key: "paid", type: "money" },
      { header: "Balance (Rs)", key: "balance", type: "money" },
      { header: "Status", key: "status", width: 16 },
    ],
    rows,
    totals: {
      tax_type: "Total",
      received: rows.reduce((s, r) => s + r.received, 0),
      paid: rows.reduce((s, r) => s + r.paid, 0),
      balance: rows.reduce((s, r) => s + r.balance, 0),
    },
  });
  const safe = client.name.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  return { wb, filename: `client-${safe}-${data.year}.xlsx` };
}

async function exportAdvice(sp: SearchParams): Promise<ExportResult> {
  const { tab, yearKey, periods, rows, filterPeriod } = await loadAdviceGrid(sp);
  const visible = filterPeriod ? rows.filter((r) => !r.marks[filterPeriod.id]) : rows;
  const wb = newWorkbook();
  const ws = wb.addWorksheet("Tax Advice");
  ws.addRow([`Tax Advice: ${tab.label} ${yearKey}`]).font = { bold: true, size: 13 };
  ws.addRow([
    `${filterPeriod ? `Not advised for ${filterPeriod.code} · ` : ""}Exported ${formatDate(stamp())} · a date means advised on that date`,
  ]).font = { italic: true, color: { argb: "FF666666" } };
  const codeRow = ws.addRow(["Client", "Tax type", ...periods.map((p) => p.code)]);
  const labelRow = ws.addRow(["", "", ...periods.map((p) => p.label)]);
  const countRow = ws.addRow([
    "",
    "",
    ...periods.map((p) => `Advised ${rows.filter((r) => r.marks[p.id]).length} of ${rows.length}`),
  ]);
  for (const r of [codeRow, labelRow, countRow]) r.font = { bold: r === codeRow };
  for (const row of visible) {
    const xr = ws.addRow([row.client_name, row.tax_type, ...periods.map((p) => excelDate(row.marks[p.id]?.advised_on))]);
    periods.forEach((p, i) => {
      const cell = xr.getCell(i + 3);
      cell.numFmt = DATE_FMT;
      const m = row.marks[p.id];
      if (m) cell.note = `Advised by ${m.advised_by}`;
    });
  }
  ws.getColumn(1).width = 36;
  ws.getColumn(2).width = 9;
  periods.forEach((_, i) => (ws.getColumn(i + 3).width = 14));
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: countRow.number }];
  return { wb, filename: `tax-advice-${tab.value}-${yearKey.replace("/", "-")}.xlsx` };
}

async function exportReceipts(sp: SearchParams): Promise<ExportResult> {
  const { rows, total, filtered } = await loadReceipts(sp);
  const wb = newWorkbook();
  addTableSheet(wb, {
    name: "Client Receipts",
    title: "Client Receipts",
    subtitle: `${filtered ? "Filtered · " : ""}${rows.length} receipts · exported ${formatDate(stamp())}`,
    cols: [
      { header: "Date received", key: "received_on", type: "date", width: 13 },
      { header: "Client", key: "client_name", width: 34 },
      { header: "Funding method", key: "funding", width: 18 },
      { header: "Payment mode", key: "mode", width: 15 },
      { header: "Ref no", key: "ref_no", width: 16 },
      { header: "Tax type", key: "tax_type", width: 9 },
      { header: "Period code", key: "period_code", width: 11 },
      { header: "Period", key: "period_label", width: 18 },
      { header: "Amount (Rs)", key: "amount", type: "money" },
      { header: "Entered by", key: "entered_by", width: 16 },
      { header: "Note", key: "note", width: 30 },
    ],
    rows: rows.map((r) => ({ ...r, funding: fundingLabel(r.funding_method), mode: paymentModeLabel(r.payment_mode) })),
    totals: { received_on: "Total", amount: total },
  });
  return { wb, filename: `client-receipts-${stamp()}.xlsx` };
}

async function exportPayments(sp: SearchParams): Promise<ExportResult> {
  const { rows, total, filtered } = await loadPayments(sp);
  const wb = newWorkbook();
  addTableSheet(wb, {
    name: "IRD Payments",
    title: "IRD Payments (list)",
    subtitle: `${filtered ? "Filtered · " : ""}${rows.length} payments · exported ${formatDate(stamp())}`,
    cols: [
      { header: "Date paid", key: "paid_on", type: "date", width: 12 },
      { header: "Client", key: "client_name", width: 34 },
      { header: "Tax type", key: "tax_type", width: 9 },
      { header: "Period code", key: "period_code", width: 11 },
      { header: "Period", key: "period_label", width: 18 },
      { header: "Amount (Rs)", key: "amount", type: "money" },
      { header: "Paid by", key: "paid_by_label", width: 15 },
      { header: "Ref no", key: "ref_no", width: 16 },
      { header: "Entered by", key: "entered_by", width: 16 },
      { header: "Note", key: "note", width: 30 },
    ],
    rows: rows.map((r) => ({ ...r, paid_by_label: paidByLabel(r.paid_by) })),
    totals: { paid_on: "Total", amount: total },
  });
  return { wb, filename: `ird-payments-list-${stamp()}.xlsx` };
}

/**
 * The IRD Payments grid in the layout of the old workbooks: clients down the side,
 * period codes across with a Date and an Amount column under each code. A client's
 * 2nd, 3rd ... part-payments go on the rows directly below. Money held with no IRD
 * payment is highlighted with a note on the cell.
 */
async function exportIrdGrid(sp: SearchParams): Promise<ExportResult> {
  const { tab, yearKey, periods, rows } = await loadIrdGrid(sp);
  const wb = newWorkbook();
  const ws = wb.addWorksheet(`${tab.label} ${yearKey}`.replace(/[/\\?*[\]:]/g, "-").slice(0, 31));
  const AMBER: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFDE68A" } };
  const RED: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFECACA" } };
  const GREY: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };

  ws.addRow([`IRD Payments: ${tab.label} ${yearKey}`]).font = { bold: true, size: 13 };
  ws.addRow([`Exported ${formatDate(stamp())} · amber = client money held, IRD payment not made · red = to recover`]).font = {
    italic: true,
    color: { argb: "FF666666" },
  };

  // Header: row A = code (merged over Date+Amount), row B = label, row C = Date | Amount.
  const firstCol = 3; // A = client, B = tax type
  const rA = ws.addRow(["Client", "Tax type"]);
  const rB = ws.addRow(["", ""]);
  const rC = ws.addRow(["", ""]);
  periods.forEach((p, i) => {
    const c = firstCol + i * 2;
    rA.getCell(c).value = p.code;
    rB.getCell(c).value = `${p.label} · due ${formatDate(p.due_date)}`;
    rC.getCell(c).value = "Date";
    rC.getCell(c + 1).value = "Amount";
    ws.mergeCells(rA.number, c, rA.number, c + 1);
    ws.mergeCells(rB.number, c, rB.number, c + 1);
  });
  for (const r of [rA, rB, rC]) {
    r.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = GREY;
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
  }
  rA.font = { bold: true };
  rC.font = { bold: true };
  ws.mergeCells(rA.number, 1, rC.number, 1);
  ws.mergeCells(rA.number, 2, rC.number, 2);

  const typeName = (t: string) => TAX_TYPES.find((x) => x.code === t)?.name ?? t;
  let lastType: string | null = null;
  for (const row of rows) {
    if (tab.value === "income" && row.tax_type !== lastType) {
      const g = ws.addRow([`${row.tax_type} · ${typeName(row.tax_type)}`]);
      g.font = { bold: true };
      g.getCell(1).fill = GREY;
      lastType = row.tax_type;
    }
    const lines = Math.max(1, ...periods.map((p) => row.cells[p.id]?.payments.length ?? 0));
    const added: ExcelJS.Row[] = [];
    // 1. Write every line for this client (one per part-payment).
    for (let i = 0; i < lines; i++) {
      const xr = ws.addRow(i === 0 ? [row.client_name, row.tax_type] : ["", ""]);
      added.push(xr);
      periods.forEach((p, pi) => {
        const c = firstCol + pi * 2;
        const pay = row.cells[p.id]?.payments[i];
        const dateCell = xr.getCell(c);
        const amountCell = xr.getCell(c + 1);
        if (pay) {
          dateCell.value = excelDate(pay.paid_on);
          amountCell.value = pay.amount;
          if (pay.paid_by === "client_direct") amountCell.note = "Paid by the client directly";
        }
        dateCell.numFmt = DATE_FMT;
        amountCell.numFmt = MONEY_FMT;
      });
    }
    // 2. Then colour held / to-recover cells across all of the client's lines.
    periods.forEach((p, pi) => {
      const cell = row.cells[p.id];
      if (!cell || cell.balance === 0) return;
      const c = firstCol + pi * 2;
      const fill = cell.balance > 0 ? AMBER : RED;
      for (const xr of added) {
        xr.getCell(c).fill = fill;
        xr.getCell(c + 1).fill = fill;
      }
      const money = (n: number) => n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      added[0].getCell(c + 1).note =
        cell.balance > 0
          ? `Held Rs ${money(cell.balance)}: received ${money(cell.received)}, paid ${money(cell.paid)}`
          : `To recover Rs ${money(-cell.balance)} from the client`;
    });
  }

  const totalRow = ws.addRow(["Total paid", ""]);
  totalRow.font = { bold: true };
  periods.forEach((p, pi) => {
    const cell = totalRow.getCell(firstCol + pi * 2 + 1);
    cell.value = rows.reduce((s, r) => s + (r.cells[p.id]?.paid ?? 0), 0);
    cell.numFmt = MONEY_FMT;
    cell.border = { top: { style: "thin" } };
  });

  ws.getColumn(1).width = 36;
  ws.getColumn(2).width = 9;
  periods.forEach((_, i) => {
    ws.getColumn(firstCol + i * 2).width = 11;
    ws.getColumn(firstCol + i * 2 + 1).width = 13;
  });
  ws.views = [{ state: "frozen", xSplit: 2, ySplit: rC.number }];
  return { wb, filename: `ird-payments-${tab.value}-${yearKey.replace("/", "-")}.xlsx` };
}

async function exportOutstanding(): Promise<ExportResult> {
  const { pending, recover, pendingTotal, recoverTotal } = await loadOutstanding();
  const wb = newWorkbook();
  addTableSheet(wb, {
    name: "Payment pending",
    title: "Payment pending: client money held, IRD payment not made",
    subtitle: `Oldest money first · exported ${formatDate(stamp())}`,
    cols: [
      { header: "Held since", key: "first_received_on", type: "date", width: 12 },
      { header: "Client", key: "client_name", width: 34 },
      { header: "Tax type", key: "tax_type", width: 9 },
      { header: "Period code", key: "period_code", width: 11 },
      { header: "Period", key: "period_label", width: 18 },
      { header: "Due", key: "due_date", type: "date" },
      { header: "Received (Rs)", key: "received_total", type: "money" },
      { header: "Paid by firm (Rs)", key: "paid_by_firm_total", type: "money" },
      { header: "Held (Rs)", key: "balance", type: "money" },
    ],
    rows: pending,
    totals: { first_received_on: "Total", balance: pendingTotal },
  });
  addTableSheet(wb, {
    name: "To recover",
    title: "To recover: the firm paid, the client has not reimbursed",
    subtitle: `Exported ${formatDate(stamp())}`,
    cols: [
      { header: "Client", key: "client_name", width: 34 },
      { header: "Tax type", key: "tax_type", width: 9 },
      { header: "Period code", key: "period_code", width: 11 },
      { header: "Period", key: "period_label", width: 18 },
      { header: "Due", key: "due_date", type: "date" },
      { header: "Last paid", key: "last_paid_on", type: "date" },
      { header: "Paid by firm (Rs)", key: "paid_by_firm_total", type: "money" },
      { header: "Received (Rs)", key: "received_total", type: "money" },
      { header: "To recover (Rs)", key: "to_recover", type: "money" },
    ],
    rows: recover.map((r) => ({ ...r, to_recover: -r.balance })),
    totals: { client_name: "Total", to_recover: recoverTotal },
  });
  return { wb, filename: `outstanding-${stamp()}.xlsx` };
}
