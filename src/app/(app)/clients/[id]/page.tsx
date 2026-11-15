import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { PageHeader } from "@/components/page-header";
import { AdviceBadge, MoneyBadge } from "@/components/status-badges";
import { createClient } from "@/lib/supabase/server";
import {
  TAX_TYPES,
  clientTypeLabel,
  taxFamily,
  yearKeys,
  type MoneyStatus,
  type TaxType,
} from "@/lib/constants";
import { colomboYear, formatAmount, formatDate } from "@/lib/format";
import { DeleteClientButton } from "./delete-client-button";
import { YearSelect } from "./year-select";

export default function ClientPage({ params, searchParams }: PageProps<"/clients/[id]">) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading client…</p>}>
      <ClientDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function ClientDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const supabase = await createClient();

  const [clientRes, periodsRes, profilesRes, marks, receipts, payments] = await Promise.all([
    supabase
      .from("clients")
      .select("*, client_tax_types(tax_type, is_active)")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle(),
    supabase.from("tax_periods").select("family, year_key").is("deleted_at", null),
    supabase.from("profiles").select("id, full_name"),
    supabase.from("advice_marks").select("id", { count: "exact", head: true }).eq("client_id", id).is("deleted_at", null),
    supabase.from("client_receipts").select("id", { count: "exact", head: true }).eq("client_id", id).is("deleted_at", null),
    supabase.from("ird_payments").select("id", { count: "exact", head: true }).eq("client_id", id).is("deleted_at", null),
  ]);

  const c = clientRes.data;
  if (!c) notFound();

  // Years that have periods: income "2026/27" counts as 2026, monthly "2026" as 2026.
  const years = [
    ...new Set((periodsRes.data ?? []).map((p) => Number(p.year_key.slice(0, 4)))),
  ].sort((a, b) => b - a);
  const requested = Number(Array.isArray(sp.year) ? sp.year[0] : sp.year);
  const thisYear = colomboYear();
  const year = years.includes(requested)
    ? requested
    : years.includes(thisYear)
      ? thisYear
      : (years[0] ?? thisYear);
  const keys = yearKeys(year);

  const { data: obligations } = await supabase
    .from("obligation_status")
    .select("*")
    .eq("client_id", id)
    .in("year_key", [keys.income, keys.monthly])
    .order("sort_order");

  const names = new Map((profilesRes.data ?? []).map((p) => [p.id, p.full_name]));
  const activeTypes = TAX_TYPES.map((t) => t.code).filter((code) =>
    c.client_tax_types.some((t) => t.is_active && t.tax_type === code),
  );
  const hasRecords = (marks.count ?? 0) + (receipts.count ?? 0) + (payments.count ?? 0) > 0;

  return (
    <div className="grid gap-6">
      <PageHeader
        back={{ href: "/clients", label: "Clients" }}
        title={
          <span className="flex flex-wrap items-center gap-3">
            {c.name}
            {!c.is_active && <Badge variant="outline">Inactive</Badge>}
          </span>
        }
        description={clientTypeLabel(c.client_type)}
        actions={
          <>
            <Link href={`/clients/${c.id}/edit`} className={buttonVariants({ variant: "outline" })}>
              <Pencil className="size-4" />
              Edit
            </Link>
            {!hasRecords && <DeleteClientButton id={c.id} name={c.name} />}
          </>
        }
      />

      <dl className="grid gap-x-8 gap-y-3 rounded-lg border p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <Detail label="Contact person" value={c.contact_person} />
        <Detail label="Phone" value={c.phone} />
        <Detail label="Email" value={c.email} />
        <Detail label="TIN" value={c.tin} />
        <div className="grid gap-1 sm:col-span-2 lg:col-span-4">
          <dt className="text-muted-foreground">Tax types</dt>
          <dd className="flex flex-wrap gap-1">
            {activeTypes.length ? (
              activeTypes.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))
            ) : (
              <span className="text-muted-foreground">None</span>
            )}
          </dd>
        </div>
        {c.notes && (
          <div className="grid gap-1 sm:col-span-2 lg:col-span-4">
            <dt className="text-muted-foreground">Notes</dt>
            <dd className="whitespace-pre-wrap">{c.notes}</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Obligations</h2>
        {years.length > 0 && <YearSelect years={years} value={year} />}
      </div>

      {activeTypes.length === 0 ? (
        <p className="text-sm text-muted-foreground">This client has no active tax types.</p>
      ) : (
        activeTypes.map((t) => (
          <ObligationTable
            key={t}
            taxType={t}
            yearKey={taxFamily(t) === "income" ? keys.income : keys.monthly}
            rows={(obligations ?? []).filter((o) => o.tax_type === t)}
            names={names}
          />
        ))
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-1">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value || <span className="text-muted-foreground">-</span>}</dd>
    </div>
  );
}

type ObligationRow = {
  period_id: string | null;
  period_code: string | null;
  period_label: string | null;
  due_date: string | null;
  is_advised: boolean | null;
  advised_on: string | null;
  advised_by: string | null;
  received_total: number | null;
  paid_total: number | null;
  balance: number | null;
  money_status: string | null;
};

function ObligationTable({
  taxType,
  yearKey,
  rows,
  names,
}: {
  taxType: TaxType;
  yearKey: string;
  rows: ObligationRow[];
  names: Map<string, string>;
}) {
  const info = TAX_TYPES.find((t) => t.code === taxType)!;
  const received = rows.reduce((s, r) => s + Number(r.received_total ?? 0), 0);
  const paid = rows.reduce((s, r) => s + Number(r.paid_total ?? 0), 0);

  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-medium">
        {taxType} · {info.name} · {yearKey}
      </h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No periods for {yearKey}. Generate them in Settings.
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Code</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Advice</TableHead>
                <TableHead className="text-right">Received (Rs)</TableHead>
                <TableHead className="text-right">Paid to IRD (Rs)</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.period_id}>
                  <TableCell className="font-mono">{r.period_code}</TableCell>
                  <TableCell>{r.period_label}</TableCell>
                  <TableCell>{formatDate(r.due_date)}</TableCell>
                  <TableCell>
                    <AdviceBadge
                      advised={Boolean(r.is_advised)}
                      advisedOn={r.advised_on}
                      advisedBy={r.advised_by ? names.get(r.advised_by) : null}
                    />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(r.received_total) ? formatAmount(r.received_total) : ""}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(r.paid_total) ? formatAmount(r.paid_total) : ""}
                  </TableCell>
                  <TableCell>
                    <MoneyBadge
                      status={(r.money_status ?? "no_activity") as MoneyStatus}
                      balance={Number(r.balance ?? 0)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="font-medium">
                  Total
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatAmount(received)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatAmount(paid)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}
    </section>
  );
}
