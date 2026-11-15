import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EntryFilters } from "@/components/entry-filters";
import { createClient } from "@/lib/supabase/server";
import { PAID_BY, paidByLabel, yearKeys, type PaidBy, type TaxType } from "@/lib/constants";
import { formatAmount, formatDate } from "@/lib/format";

const ROW_LIMIT = 5000;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);
const isIso = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);
const tabFor = (t: TaxType) => (t === "WHT" ? "wht" : t === "APIT" ? "apit" : "income");

/** Flat list of IRD payments with the same filters as Client Receipts. */
export async function PaymentsList({ sp }: { sp: Record<string, string | string[] | undefined> }) {
  const f = {
    client: first(sp.client),
    tax: first(sp.tax) as TaxType | "",
    year: Number(first(sp.year)) || null,
    period: first(sp.period),
    paidBy: first(sp.paid_by) as PaidBy | "",
    from: first(sp.from),
    to: first(sp.to),
    ref: first(sp.ref).trim(),
  };

  const supabase = await createClient();
  const [clientsRes, periodsRes] = await Promise.all([
    supabase.from("clients").select("id, name").is("deleted_at", null).order("name"),
    supabase
      .from("tax_periods")
      .select("id, family, code, label, year_key, sort_order")
      .is("deleted_at", null)
      .order("sort_order"),
  ]);
  const periods = periodsRes.data ?? [];
  const years = [...new Set(periods.map((p) => Number(p.year_key.slice(0, 4))))].sort((a, b) => b - a);

  let query = supabase
    .from("ird_payments")
    .select(
      "id, client_id, tax_type, period_id, paid_on, amount, paid_by, ref_no, note, created_at, clients(name), tax_periods!ird_payments_period_family_fkey(code, label, year_key), profiles!ird_payments_created_by_fkey(full_name)",
    )
    .is("deleted_at", null)
    .order("paid_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);
  if (isUuid(f.client)) query = query.eq("client_id", f.client);
  if (f.tax) query = query.eq("tax_type", f.tax);
  if (f.paidBy) query = query.eq("paid_by", f.paidBy);
  if (isIso(f.from)) query = query.gte("paid_on", f.from);
  if (isIso(f.to)) query = query.lte("paid_on", f.to);
  if (f.ref) query = query.ilike("ref_no", `%${f.ref.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  if (isUuid(f.period)) query = query.eq("period_id", f.period);
  else if (f.year) {
    const keys = yearKeys(f.year);
    const ids = periods.filter((p) => p.year_key === keys.income || p.year_key === keys.monthly).map((p) => p.id);
    query = query.in("period_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  }
  const { data, error } = await query;

  const filters = (
    <EntryFilters
      basePath="/ird-payments?view=list"
      clients={(clientsRes.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
      periods={periods}
      years={years}
      extraSelects={[{ param: "paid_by", label: "Paid by", options: PAID_BY }]}
    />
  );
  if (error) {
    return (
      <div className="grid gap-4">
        {filters}
        <p className="text-sm text-destructive">Could not load payments: {error.message}</p>
      </div>
    );
  }

  const rows = data ?? [];
  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const filtered = Object.values(f).some(Boolean);

  return (
    <div className="grid min-w-0 gap-4">
      {filters}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <p className="font-medium">{filtered ? "No payments match these filters." : "No IRD payments yet."}</p>
          {!filtered && (
            <p className="mt-1 text-sm text-muted-foreground">Record payments from the Grid: click a cell to open it.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date paid</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Tax type</TableHead>
                  <TableHead>Period code</TableHead>
                  <TableHead className="text-right">Amount (Rs)</TableHead>
                  <TableHead>Paid by</TableHead>
                  <TableHead>Ref no</TableHead>
                  <TableHead>Entered by</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} data-payment-row={r.id}>
                    <TableCell className="tabular-nums">{formatDate(r.paid_on)}</TableCell>
                    <TableCell className="font-medium">{r.clients?.name}</TableCell>
                    <TableCell>{r.tax_type}</TableCell>
                    <TableCell>
                      <span className="font-mono" title={`${r.tax_periods?.label} · ${r.tax_periods?.year_key}`}>
                        {r.tax_periods?.code}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatAmount(r.amount)}</TableCell>
                    <TableCell>{paidByLabel(r.paid_by)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.ref_no}</TableCell>
                    <TableCell className="text-muted-foreground">{r.profiles?.full_name}</TableCell>
                    <TableCell>
                      <Link
                        href={`/ird-payments?tab=${tabFor(r.tax_type)}&year=${r.tax_periods?.year_key.slice(0, 4)}&open=${r.client_id}:${r.tax_type}:${r.period_id}`}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                        aria-label={`Open ${r.clients?.name} ${r.tax_type} ${r.tax_periods?.code} in the grid`}
                      >
                        Open
                        <ArrowUpRight className="size-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="font-medium">
                    Total of {rows.length} {rows.length === 1 ? "payment" : "payments"}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums" data-total>
                    {formatAmount(total)}
                  </TableCell>
                  <TableCell colSpan={4} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
          {rows.length >= ROW_LIMIT && (
            <p className="text-sm text-amber-700">Showing the latest {ROW_LIMIT} payments. Narrow the filters.</p>
          )}
        </div>
      )}
    </div>
  );
}
