/**
 * Minimal RFC 4180 CSV parser: commas, double-quoted fields, "" escapes,
 * CRLF or LF line endings. Blank lines are skipped. Returns rows of trimmed cells
 * with their 1-based line number, for error messages.
 */
export function parseCsv(text: string): { line: number; cells: string[] }[] {
  const rows: { line: number; cells: string[] }[] = [];
  let cells: string[] = [];
  let cell = "";
  let inQuotes = false;
  let line = 1;
  let rowStartLine = 1;

  const endRow = () => {
    cells.push(cell);
    if (cells.some((c) => c.trim() !== "")) {
      rows.push({ line: rowStartLine, cells: cells.map((c) => c.trim()) });
    }
    cells = [];
    cell = "";
  };

  const src = text.replace(/^﻿/, ""); // strip Excel's byte-order mark
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      cells.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      endRow();
      line++;
      rowStartLine = line;
    } else {
      cell += ch;
    }
  }
  endRow();
  return rows;
}
