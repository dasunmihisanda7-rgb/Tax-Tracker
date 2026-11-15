import { Suspense } from "react";
import Link from "next/link";
import { Pencil, Plus } from "lucide-react";
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
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import {
  FUNDING_METHODS,
  PAYMENT_MODES,
  fundingLabel,
  paymentModeLabel,
  yearKeys,
  type FundingMethod,
  type PaymentMode,
  type TaxType,
} from "@/lib/constants";
import { formatAmount, formatDate } from "@/lib/format";
import { DeleteReceiptButton } from "./delete-receipt-button";

const ROW_LIMIT = 5000;

export default function ClientReceiptsPage({ searchParams }: PageProps<"/client-receipts">) {
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        title="Client Receipts"
        description="Money clients gave the firm: by which method, on what date, under which reference."
        actions={
          <Link href="/client-receipts/new" className={buttonVariants()}>
            <Plus className="size-4" />
            Add receipt
          </Link>
        }
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading receipts…</p>}>
        <Receipts searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);
const isIso = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v);

async function Receipts({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const f = {
    client: first(sp.client),
    tax: first(sp.tax) as TaxType | "",
    year: Number(first(sp.year)) || null,
    period: first(sp.period),
    funding: first(sp.funding) as FundingMethod | "",
    mode: first(sp.mode) as PaymentMode | "",
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
    .from("client_receipts")
    .select(
      "id, received_on, funding_method, payment_mode, ref_no, tax_type, amount, note, created_at, clients(name), tax_periods!client_receipts_period_family_fkey(code, label, year_key), profiles!client_receipts_created_by_fkey(full_name)",
    )
    .is("deleted_at", null)
    .order("received_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT);

  if (isUuid(f.client)) query = query.eq("client_id", f.client);
  if (f.tax) query = query.eq("tax_type", f.tax);
  if (f.funding) query = query.eq("funding_method", f.funding);
  if (f.mode) query = query.eq("payment_mode", f.mode);
  if (isIso(f.from)) query = query.gte("received_on", f.from);
  if (isIso(f.to)) query = query.lte("received_on", f.to);
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
      basePath="/client-receipts"
      clients={(clientsRes.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
      periods={periods}
      years={years}
      extraSelects={[
        { param: "funding", label: "Funding method", options: FUNDING_METHODS.map((m) => ({ value: m.value, label: m.label })) },
        { param: "mode", label: "Payment mode", options: PAYMENT_MODES },
      ]}
    />
  );

  if (error) {
    return (
      <div className="grid gap-4">
        {filters}
        <p className="text-sm text-destructive">Could not load receipts: {error.message}</p>
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
          <p className="font-medium">{filtered ? "No receipts match these filters." : "No receipts yet."}</p>
          {!filtered && (
            <p className="mt-1 text-sm text-muted-foreground">Use Add receipt to record money received from a client.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-2">
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date received</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Funding method</TableHead>
                  <TableHead>Payment mode</TableHead>
                  <TableHead>Ref no</TableHead>
                  <TableHead>Tax type</TableHead>
                  <TableHead>Period code</TableHead>
                  <TableHead className="text-right">Amount (Rs)</TableHead>
                  <TableHead>Entered by</TableHead>
                  <TableHead className="w-20" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id} data-receipt={r.id}>
                    <TableCell className="tabular-nums">{formatDate(r.received_on)}</TableCell>
                    <TableCell className="font-medium">{r.clients?.name}</TableCell>
                    <TableCell>{fundingLabel(r.funding_method)}</TableCell>
                    <TableCell>{paymentModeLabel(r.payment_mode)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.ref_no}</TableCell>
                    <TableCell>{r.tax_type}</TableCell>
                    <TableCell>
                      <span className="font-mono" title={`${r.tax_periods?.label} · ${r.tax_periods?.year_key}`}>
                        {r.tax_periods?.code}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatAmount(r.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{r.profiles?.full_name}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/client-receipts/${r.id}/edit`}
                          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                          aria-label={`Edit receipt ${r.ref_no ?? ""} ${r.tax_periods?.code ?? ""}`}
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <DeleteReceiptButton
                          id={r.id}
                          summary={`${r.clients?.name}, ${r.tax_type} ${r.tax_periods?.code}, Rs ${formatAmount(r.amount)} received ${formatDate(r.received_on)}`}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={7} className="font-medium">
                    Total of {rows.length} {rows.length === 1 ? "receipt" : "receipts"}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums" data-total>
                    {formatAmount(total)}
                  </TableCell>
                  <TableCell colSpan={2} />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
          {rows.length >= ROW_LIMIT && (
            <p className="text-sm text-amber-700">
              Showing the latest {ROW_LIMIT} receipts. Narrow the filters to see older ones.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
