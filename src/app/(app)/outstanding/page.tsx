import { Fragment, Suspense } from "react";
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
import { PageHeader } from "@/components/page-header";
import { ExportButton } from "@/components/export-button";
import { TableSkeleton } from "@/components/skeletons";
import { UrlTabs } from "@/components/url-controls";
import { loadOutstanding, type OutstandingRow } from "@/lib/data/outstanding";
import { first, type SearchParams } from "@/lib/data/params";
import { formatAmount, formatDate } from "@/lib/format";
import { irdCellHref } from "@/lib/links";

export default function OutstandingPage({ searchParams }: PageProps<"/outstanding">) {
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        title="Outstanding"
        description="Money held for the IRD, and money the firm paid that clients still owe."
        actions={
          <Suspense>
            <ExportButton kind="outstanding" />
          </Suspense>
        }
      />
      <Suspense fallback={<TableSkeleton />}>
        <Outstanding searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

type Obligation = OutstandingRow;

async function Outstanding({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const tab = first(sp.tab) === "recover" ? "recover" : "pending";
  const { pending, recover, pendingTotal, recoverTotal, error } = await loadOutstanding();
  if (error) return <p className="text-sm text-destructive">Could not load: {error}</p>;

  return (
    <div className="grid min-w-0 gap-4">
      <UrlTabs
        param="tab"
        value={tab}
        tabs={[
          { value: "pending", label: `Payment pending (${pending.length})` },
          { value: "recover", label: `To recover (${recover.length})` },
        ]}
      />
      {tab === "pending" ? (
        <PendingTable rows={pending} total={pendingTotal} />
      ) : (
        <RecoverTable rows={recover} total={recoverTotal} />
      )}
    </div>
  );
}

function OpenLink({ o }: { o: Obligation }) {
  return (
    <Link
      href={irdCellHref(o)}
      className={buttonVariants({ variant: "ghost", size: "sm" })}
      aria-label={`Open ${o.client_name} ${o.tax_type} ${o.period_code} in IRD Payments`}
    >
      Open
      <ArrowUpRight className="size-3.5" />
    </Link>
  );
}

function ClientCell({ o }: { o: Obligation }) {
  return (
    <TableCell className="font-medium">
      <Link href={`/clients/${o.client_id}`} className="hover:underline">
        {o.client_name}
      </Link>
      {o.client_is_active === false && <span className="ml-1 text-xs text-muted-foreground">(inactive)</span>}
    </TableCell>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed p-10 text-center text-sm">{text}</div>;
}

function PendingTable({ rows, total }: { rows: Obligation[]; total: number }) {
  if (rows.length === 0) return <Empty text="No client money is waiting to be paid to the IRD." />;
  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">
        Client money is in hand but the IRD payment is not (fully) made. Oldest money first.
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Held since</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Tax type</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Due</TableHead>
              <TableHead className="text-right">Received (Rs)</TableHead>
              <TableHead className="text-right">Paid by firm (Rs)</TableHead>
              <TableHead className="text-right">Held (Rs)</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((o) => (
              <TableRow key={`${o.client_id}:${o.tax_type}:${o.period_id}`} data-pending={`${o.client_name}|${o.tax_type}|${o.period_code}`}>
                <TableCell className="tabular-nums">{formatDate(o.first_received_on)}</TableCell>
                <ClientCell o={o} />
                <TableCell>{o.tax_type}</TableCell>
                <TableCell>
                  <span className="font-mono">{o.period_code}</span>{" "}
                  <span className="text-muted-foreground">{o.period_label}</span>
                </TableCell>
                <TableCell className="tabular-nums">{formatDate(o.due_date)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatAmount(o.received_total)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {o.paid_by_firm_total ? formatAmount(o.paid_by_firm_total) : ""}
                </TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatAmount(o.balance)}</TableCell>
                <TableCell>
                  <OpenLink o={o} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={7} className="font-medium">
                Total held for {rows.length} {rows.length === 1 ? "obligation" : "obligations"}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums" data-total>
                {formatAmount(total)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}

function RecoverTable({ rows, total }: { rows: Obligation[]; total: number }) {
  if (rows.length === 0) return <Empty text="No amounts to recover from clients." />;
  const clients = [...new Set(rows.map((r) => r.client_id))].map((id) => {
    const items = rows.filter((r) => r.client_id === id);
    return { id, name: items[0].client_name, items, total: items.reduce((s, o) => s - o.balance, 0) };
  });
  return (
    <div className="grid gap-2">
      <p className="text-sm text-muted-foreground">
        The firm paid the IRD and the client has not (fully) reimbursed it.
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Tax type</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Last paid</TableHead>
              <TableHead className="text-right">Paid by firm (Rs)</TableHead>
              <TableHead className="text-right">Received (Rs)</TableHead>
              <TableHead className="text-right">To recover (Rs)</TableHead>
              <TableHead className="w-20" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <Fragment key={c.id}>
                {c.items.map((o) => (
                  <TableRow key={`${o.tax_type}:${o.period_id}`} data-recover={`${o.client_name}|${o.tax_type}|${o.period_code}`}>
                    <ClientCell o={o} />
                    <TableCell>{o.tax_type}</TableCell>
                    <TableCell>
                      <span className="font-mono">{o.period_code}</span>{" "}
                      <span className="text-muted-foreground">{o.period_label}</span>
                    </TableCell>
                    <TableCell className="tabular-nums">{formatDate(o.due_date)}</TableCell>
                    <TableCell className="tabular-nums">{formatDate(o.last_paid_on)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatAmount(o.paid_by_firm_total)}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {o.received_total ? formatAmount(o.received_total) : ""}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatAmount(-o.balance)}</TableCell>
                    <TableCell>
                      <OpenLink o={o} />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/40" data-client-total={c.name}>
                  <TableCell colSpan={7} className="text-sm font-medium">
                    Subtotal for {c.name}
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums">{formatAmount(c.total)}</TableCell>
                  <TableCell />
                </TableRow>
              </Fragment>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={7} className="font-medium">
                Total to recover from {clients.length} {clients.length === 1 ? "client" : "clients"}
              </TableCell>
              <TableCell className="text-right font-semibold tabular-nums" data-total>
                {formatAmount(total)}
              </TableCell>
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
