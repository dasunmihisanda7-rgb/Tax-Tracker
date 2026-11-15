export type SearchParams = Record<string, string | string[] | undefined>;

export const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
export const isUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export const isIso = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

/** URLSearchParams (route handlers) -> the same plain object pages receive. */
export function fromUrlSearchParams(params: URLSearchParams): SearchParams {
  const out: SearchParams = {};
  for (const [k, v] of params) out[k] = v;
  return out;
}

/** Escapes % _ \ for use inside an ILIKE pattern. */
export const likeEscape = (s: string) => s.replace(/[%_\\]/g, (c) => `\\${c}`);

/** Income "2026/27" for year 2026. */
export const incomeYearKey = (y: number) => `${y}/${String((y + 1) % 100).padStart(2, "0")}`;
