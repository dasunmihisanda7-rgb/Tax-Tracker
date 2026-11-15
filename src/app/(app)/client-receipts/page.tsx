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
import { ExportButton } from "@/components/export-button";
import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/skeletons";
import { FUNDING_METHODS, PAYMENT_MODES, fundingLabel, paymentModeLabel } from "@/lib/constants";
import { ROW_LIMIT, loadReceipts } from "@/lib/data/entries";
import type { SearchParams } from "@/lib/data/params";
import { formatAmount, formatDate } from "@/lib/format";
import { DeleteReceiptButton } from "./delete-receipt-button";

export default function ClientReceiptsPage({ searchParams }: PageProps<"/client-receipts">) {
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader
        title="Client Receipts"
        description="Money clients gave the firm: by which method, on what date, under which reference."
        actions={
          <>
            <Suspense>
              <ExportButton kind="receipts" />
            </Suspense>
            <Link href="/client-receipts/new" className={buttonVariants()}>
              <Plus className="size-4" />
              Add receipt
            </Link>
          </>
        }
      />
      <Suspense fallback={<TableSkeleton withFilters />}>
        <Receipts searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Receipts({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { rows, total, filtered, clients, periods, years, error } = await loadReceipts(await searchParams);

  const filters = (
    <EntryFilters
      basePath="/client-receipts"
      clients={clients.map((c) => ({ value: c.id, label: c.name }))}
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
        <p className="text-sm text-destructive">Could not load receipts: {error}</p>
      </div>
    );
  }

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
                    <TableCell className="font-medium">{r.client_name}</TableCell>
                    <TableCell>{fundingLabel(r.funding_method)}</TableCell>
                    <TableCell>{paymentModeLabel(r.payment_mode)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.ref_no}</TableCell>
                    <TableCell>{r.tax_type}</TableCell>
                    <TableCell>
                      <span className="font-mono" title={`${r.period_label} · ${r.year_key}`}>
                        {r.period_code}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatAmount(r.amount)}</TableCell>
                    <TableCell className="text-muted-foreground">{r.entered_by}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Link
                          href={`/client-receipts/${r.id}/edit`}
                          className={buttonVariants({ variant: "ghost", size: "icon-sm" })}
                          aria-label={`Edit receipt ${r.ref_no ?? ""} ${r.period_code}`}
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <DeleteReceiptButton
                          id={r.id}
                          summary={`${r.client_name}, ${r.tax_type} ${r.period_code}, Rs ${formatAmount(r.amount)} received ${formatDate(r.received_on)}`}
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
