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
import { PAID_BY, paidByLabel } from "@/lib/constants";
import { ROW_LIMIT, loadPayments } from "@/lib/data/entries";
import type { SearchParams } from "@/lib/data/params";
import { formatAmount, formatDate } from "@/lib/format";
import { irdCellHref } from "@/lib/links";

/** Flat list of IRD payments with the same filters as Client Receipts. */
export async function PaymentsList({ sp }: { sp: SearchParams }) {
  const { rows, total, filtered, clients, periods, years, error } = await loadPayments(sp);

  const filters = (
    <EntryFilters
      basePath="/ird-payments?view=list"
      clients={clients.map((c) => ({ value: c.id, label: c.name }))}
      periods={periods}
      years={years}
      extraSelects={[{ param: "paid_by", label: "Paid by", options: PAID_BY }]}
    />
  );
  if (error) {
    return (
      <div className="grid gap-4">
        {filters}
        <p className="text-sm text-destructive">Could not load payments: {error}</p>
      </div>
    );
  }

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
                    <TableCell className="font-medium">{r.client_name}</TableCell>
                    <TableCell>{r.tax_type}</TableCell>
                    <TableCell>
                      <span className="font-mono" title={`${r.period_label} · ${r.year_key}`}>
                        {r.period_code}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatAmount(r.amount)}</TableCell>
                    <TableCell>{paidByLabel(r.paid_by)}</TableCell>
                    <TableCell className="font-mono text-xs">{r.ref_no}</TableCell>
                    <TableCell className="text-muted-foreground">{r.entered_by}</TableCell>
                    <TableCell>
                      <Link
                        href={irdCellHref(r)}
                        className={buttonVariants({ variant: "ghost", size: "sm" })}
                        aria-label={`Open ${r.client_name} ${r.tax_type} ${r.period_code} in the grid`}
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
