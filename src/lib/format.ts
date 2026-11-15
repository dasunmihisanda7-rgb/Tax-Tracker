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

/** Today's calendar year in Asia/Colombo. */
export function colomboYear(now: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Colombo", year: "numeric" }).format(now),
  );
}
