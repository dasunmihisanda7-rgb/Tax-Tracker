// Display formats from PLAN.md section 5: rupees with thousand separators and
// two decimals, dates as DD/MM/YYYY, timestamps in Asia/Colombo.

const rupees = new Intl.NumberFormat("en-LK", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** 25000 -> "25,000.00" */
export function formatAmount(value: number | string | null | undefined): string {
  return rupees.format(Number(value ?? 0));
}

/** 25000 -> "Rs 25,000.00" */
export function formatRs(value: number | string | null | undefined): string {
  return `Rs ${formatAmount(value)}`;
}

/** Postgres date "2026-11-15" -> "15/11/2026". Parsed by hand to avoid time-zone shifts. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const colomboDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Colombo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Timestamp -> "15/11/2026, 14:05" in Asia/Colombo. */
export function formatDateTime(ts: string | null | undefined): string {
  return ts ? colomboDateTime.format(new Date(ts)) : "";
}

/** Today's date in Asia/Colombo as an ISO date, "2026-11-15". */
export function colomboTodayIso(now: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** ISO date "2026-11-15" -> local Date at midnight (for date pickers). */
export function isoToDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Local Date -> ISO date "2026-11-15" (no time-zone shift). */
export function dateToIso(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * The year of assessment that is running today: 1 April to 31 March.
 * 15 Nov 2026 -> 2026 (2026/27); 10 Feb 2027 -> 2026 (2026/27).
 */
export function currentAssessmentYear(now: Date = new Date()): number {
  const [y, m] = colomboTodayIso(now).split("-").map(Number);
  return m >= 4 ? y : y - 1;
}

/** Today's calendar year in Asia/Colombo. */
export function colomboYear(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo", year: "numeric" }).format(now),
  );
}
