import "server-only";
import ExcelJS from "exceljs";

export const MONEY_FMT = "#,##0.00";
export const DATE_FMT = "dd/mm/yyyy";

export type Col = {
  header: string;
  key: string;
  width?: number;
  type?: "text" | "date" | "money";
};

/** ISO date "2026-11-15" -> a real Excel date (UTC midnight, so it never shifts a day). */
export function excelDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function newWorkbook() {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Vidhana & Co. Tax Tracker";
  wb.created = new Date();
  return wb;
}

const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFEFEFEF" } };

/**
 * A plain table sheet: title row, header row, data rows and an optional total row.
 * Dates and money are written as real dates and numbers with DD/MM/YYYY and #,##0.00 formats.
 */
export function addTableSheet(
  wb: ExcelJS.Workbook,
  opts: {
    name: string;
    title: string;
    subtitle?: string;
    cols: Col[];
    rows: Record<string, unknown>[];
    totals?: Record<string, number | string>;
  },
) {
  const ws = wb.addWorksheet(opts.name.slice(0, 31));
  ws.addRow([opts.title]).font = { bold: true, size: 13 };
  ws.addRow([opts.subtitle ?? ""]).font = { italic: true, color: { argb: "FF666666" } };
  const headerRow = ws.addRow(opts.cols.map((c) => c.header));
  headerRow.font = { bold: true };
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.border = { bottom: { style: "thin" } };
  });
  const headerIndex = headerRow.number;

  for (const r of opts.rows) {
    const row = ws.addRow(
      opts.cols.map((c) => {
        const v = r[c.key];
        if (c.type === "date") return excelDate(v as string | null);
        if (c.type === "money") return v === null || v === undefined || v === "" ? null : Number(v);
        return v ?? "";
      }),
    );
    opts.cols.forEach((c, i) => {
      if (c.type === "date") row.getCell(i + 1).numFmt = DATE_FMT;
      if (c.type === "money") row.getCell(i + 1).numFmt = MONEY_FMT;
    });
  }

  if (opts.totals) {
    const totalRow = ws.addRow(opts.cols.map((c) => opts.totals![c.key] ?? ""));
    totalRow.font = { bold: true };
    opts.cols.forEach((c, i) => {
      const cell = totalRow.getCell(i + 1);
      cell.border = { top: { style: "thin" } };
      if (c.type === "money") cell.numFmt = MONEY_FMT;
    });
  }

  opts.cols.forEach((c, i) => {
    ws.getColumn(i + 1).width = c.width ?? (c.type === "date" ? 12 : c.type === "money" ? 15 : 18);
  });
  ws.views = [{ state: "frozen", ySplit: headerIndex }];
  if (opts.rows.length) {
    ws.autoFilter = { from: { row: headerIndex, column: 1 }, to: { row: headerIndex, column: opts.cols.length } };
  }
  return ws;
}

/** Streams a workbook back as an .xlsx download. */
export async function xlsxResponse(wb: ExcelJS.Workbook, filename: string) {
  const buffer = await wb.xlsx.writeBuffer();
  return new Response(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
