"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DatePicker } from "@/components/date-picker";
import { SimpleSelect } from "@/components/simple-select";
import { cn } from "@/lib/utils";
import { TAX_TYPES } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  changeAdviceDate,
  markAdvice,
  unmarkAdvice,
  type ActionResult,
  type AdviceItem,
} from "@/lib/advice/actions";

import type { AdviceMark, AdviceRow, GridPeriod as AdvicePeriod } from "@/lib/data/grids";
export type { AdviceMark, AdviceRow, GridPeriod as AdvicePeriod } from "@/lib/data/grids";

type Props = {
  tab: string;
  yearKey: string;
  periods: AdvicePeriod[];
  rows: AdviceRow[];
  filterPeriodId: string | null;
  wholeYearPeriodIds: string[];
  today: string;
};

export function AdviceGrid({ tab, yearKey, periods, rows, filterPeriodId, wholeYearPeriodIds, today }: Props) {
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [unmark, setUnmark] = useState<{ mark: AdviceMark; row: AdviceRow; period: AdvicePeriod } | null>(null);
  const [bulkPeriod, setBulkPeriod] = useState<string>(filterPeriodId ?? periods[0].id);
  const [bulkDate, setBulkDate] = useState<string>(today);

  const visible = useMemo(
    () => (filterPeriodId ? rows.filter((r) => !r.marks[filterPeriodId]) : rows),
    [rows, filterPeriodId],
  );
  // Counters always cover every registered client, whatever the filter.
  const counts = useMemo(
    () => Object.fromEntries(periods.map((p) => [p.id, rows.filter((r) => r.marks[p.id]).length])),
    [periods, rows],
  );
  const groups = useMemo(() => {
    const types = [...new Set(visible.map((r) => r.tax_type))];
    return types.map((t) => ({ taxType: t, rows: visible.filter((r) => r.tax_type === t) }));
  }, [visible]);
  const showGroupHeaders = tab === "income";

  const run = (keys: string[], fn: () => Promise<ActionResult>, success?: (r: ActionResult) => string | null) => {
    setBusy((b) => new Set([...b, ...keys]));
    startTransition(async () => {
      const res = await fn();
      setBusy((b) => {
        const n = new Set(b);
        keys.forEach((k) => n.delete(k));
        return n;
      });
      if (!res.ok) toast.error(res.error);
      else {
        const msg = success?.(res);
        if (msg) toast.success(msg);
      }
    });
  };

  const item = (row: AdviceRow, periodId: string): AdviceItem => ({
    client_id: row.client_id,
    tax_type: row.tax_type,
    period_id: periodId,
  });

  const tick = (row: AdviceRow, period: AdvicePeriod) =>
    run([`${row.key}:${period.id}`], () => markAdvice([item(row, period.id)]));

  const markYear = (row: AdviceRow, date: string) =>
    run(
      wholeYearPeriodIds.map((p) => `${row.key}:${p}`),
      () => markAdvice(wholeYearPeriodIds.map((p) => item(row, p)), date),
      (r) => (r.ok ? `${row.client_name}: ${r.count ?? 0} ${r.count === 1 ? "period" : "periods"} marked.` : null),
    );

  const markSelected = () => {
    const targets = visible.filter((r) => selected.has(r.key));
    const period = periods.find((p) => p.id === bulkPeriod)!;
    run(
      targets.map((r) => `${r.key}:${bulkPeriod}`),
      () => markAdvice(targets.map((r) => item(r, bulkPeriod)), bulkDate),
      (r) => {
        if (!r.ok) return null;
        setSelected(new Set());
        return `${period.code}: ${r.count ?? 0} ${r.count === 1 ? "client" : "clients"} marked.`;
      },
    );
  };

  const allVisibleSelected = visible.length > 0 && visible.every((r) => selected.has(r.key));
  const toggleAll = (on: boolean) => setSelected(on ? new Set(visible.map((r) => r.key)) : new Set());
  const toggleRow = (key: string, on: boolean) =>
    setSelected((s) => {
      const n = new Set(s);
      if (on) n.add(key);
      else n.delete(key);
      return n;
    });

  const wholeYearLabel = tab === "income" ? `all 4 instalments of ${yearKey}` : `all 12 months of ${yearKey}`;
  const selectedVisible = visible.filter((r) => selected.has(r.key)).length;

  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex min-h-9 flex-wrap items-center gap-3 text-sm">
        <span className="text-muted-foreground">
          {visible.length} of {rows.length} {rows.length === 1 ? "client" : "clients"} shown
        </span>
        {selectedVisible > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/50 px-3 py-1.5">
            <span className="font-medium">{selectedVisible} selected</span>
            <span className="text-muted-foreground">· Mark</span>
            <SimpleSelect
              ariaLabel="Period to mark"
              value={bulkPeriod}
              onChange={setBulkPeriod}
              options={periods.map((p) => ({ value: p.id, label: `${p.code} ${p.label}` }))}
              className="h-7 min-w-48"
            />
            <span className="text-muted-foreground">advised on</span>
            <DatePicker value={bulkDate} onChange={setBulkDate} max={today} ariaLabel="Advice date" className="h-7" />
            <Button size="sm" onClick={markSelected} disabled={pending}>
              Mark selected
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        )}
      </div>

      <div className="max-h-[70vh] overflow-auto rounded-lg border">
        <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-20 bg-background">
            <tr>
              <th className="sticky left-0 z-30 w-10 border-b bg-background px-3 py-2">
                <Checkbox
                  aria-label="Select all shown clients"
                  checked={allVisibleSelected}
                  onCheckedChange={(on) => toggleAll(on === true)}
                />
              </th>
              <th className="sticky left-10 z-30 min-w-56 border-r border-b bg-background px-3 py-2 text-left font-medium">
                Client
              </th>
              {periods.map((p) => (
                <th
                  key={p.id}
                  className={cn(
                    "min-w-28 border-b px-2 py-2 text-center align-bottom font-normal",
                    p.id === filterPeriodId && "bg-amber-50 dark:bg-amber-950/40",
                  )}
                >
                  <div className="text-[11px] text-muted-foreground" data-counter={p.code}>
                    Advised {counts[p.id]} of {rows.length}
                  </div>
                  <div className="font-mono font-medium">{p.code}</div>
                  <div className="text-xs text-muted-foreground">{p.label}</div>
                  <div className="text-[11px] text-muted-foreground">Due {formatDate(p.due_date)}</div>
                </th>
              ))}
              <th className="border-b px-3 py-2 text-left font-normal text-muted-foreground">Whole year</th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td colSpan={periods.length + 3} className="p-8 text-center text-muted-foreground">
                  Every client has been advised for this period.
                </td>
              </tr>
            )}
            {groups.map((g) => (
              <Fragment key={g.taxType}>
                {showGroupHeaders && (
                  <tr>
                    <td
                      colSpan={periods.length + 3}
                      className="border-b bg-muted/60 px-3 py-1.5 text-xs font-semibold tracking-wide"
                    >
                      <span className="sticky left-3">
                        {g.taxType} · {TAX_TYPES.find((t) => t.code === g.taxType)?.name} ({g.rows.length})
                      </span>
                    </td>
                  </tr>
                )}
                {g.rows.map((row) => (
                  <tr key={row.key} className="group hover:bg-muted/30">
                    <td className="sticky left-0 z-10 border-b bg-background px-3 py-1.5 group-hover:bg-muted">
                      <Checkbox
                        aria-label={`Select ${row.client_name}`}
                        checked={selected.has(row.key)}
                        onCheckedChange={(on) => toggleRow(row.key, on === true)}
                      />
                    </td>
                    <td className="sticky left-10 z-10 border-r border-b bg-background px-3 py-1.5 group-hover:bg-muted">
                      <Link href={`/clients/${row.client_id}`} className="font-medium hover:underline">
                        {row.client_name}
                      </Link>
                    </td>
                    {periods.map((p) => (
                      <AdviceCell
                        key={p.id}
                        row={row}
                        period={p}
                        mark={row.marks[p.id]}
                        busy={busy.has(`${row.key}:${p.id}`)}
                        highlighted={p.id === filterPeriodId}
                        today={today}
                        onTick={() => tick(row, p)}
                        onUntick={(mark) => setUnmark({ mark, row, period: p })}
                        onChangeDate={(mark, date) =>
                          run([`${row.key}:${p.id}`], () => changeAdviceDate(mark.id, date), () => "Advice date changed.")
                        }
                      />
                    ))}
                    <td className="border-b px-3 py-1.5">
                      <MarkYearButton
                        label={wholeYearLabel}
                        clientName={row.client_name}
                        today={today}
                        disabled={wholeYearPeriodIds.every((id) => row.marks[id])}
                        onMark={(date) => markYear(row, date)}
                      />
                    </td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={unmark !== null} onOpenChange={(o) => !o && setUnmark(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this advice mark?</AlertDialogTitle>
            <AlertDialogDescription>
              {unmark && (
                <>
                  {unmark.row.client_name}, {unmark.row.tax_type} {unmark.period.code} ({unmark.period.label}) was marked
                  advised on {formatDate(unmark.mark.advised_on)} by {unmark.mark.advised_by}. Removing it shows the
                  client as not advised. The change is kept in the audit log.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep mark</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={() => {
                if (!unmark) return;
                const { mark, row, period } = unmark;
                setUnmark(null);
                run([`${row.key}:${period.id}`], () => unmarkAdvice(mark.id), () => "Advice mark removed.");
              }}
            >
              Remove mark
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AdviceCell({
  row,
  period,
  mark,
  busy,
  highlighted,
  today,
  onTick,
  onUntick,
  onChangeDate,
}: {
  row: AdviceRow;
  period: AdvicePeriod;
  mark: AdviceMark | undefined;
  busy: boolean;
  highlighted: boolean;
  today: string;
  onTick: () => void;
  onUntick: (mark: AdviceMark) => void;
  onChangeDate: (mark: AdviceMark, date: string) => void;
}) {
  const label = `${row.client_name} ${row.tax_type} ${period.code}`;
  return (
    <td
      className={cn(
        "border-b px-2 py-1.5 text-center",
        highlighted && "bg-amber-50/60 dark:bg-amber-950/20",
        mark && "bg-emerald-50/60 dark:bg-emerald-950/20",
      )}
      data-cell={`${row.key}:${period.code}`}
      data-advised={mark ? "yes" : "no"}
    >
      <div className="flex flex-col items-center gap-0.5">
        {busy ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Saving" />
        ) : mark ? (
          <Tooltip>
            <TooltipTrigger render={<span className="inline-flex" />}>
              <Checkbox aria-label={`${label} advised`} checked onCheckedChange={() => onUntick(mark)} />
            </TooltipTrigger>
            <TooltipContent>
              Advised on {formatDate(mark.advised_on)} by {mark.advised_by}
              <br />
              Ticked {formatDateTime(mark.created_at)}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Checkbox aria-label={`${label} not advised`} checked={false} onCheckedChange={onTick} />
        )}
        {mark && !busy && (
          <DatePicker
            compact
            value={mark.advised_on}
            max={today}
            ariaLabel={`Change advice date for ${label}`}
            onChange={(d) => d !== mark.advised_on && onChangeDate(mark, d)}
          />
        )}
      </div>
    </td>
  );
}

function MarkYearButton({
  label,
  clientName,
  today,
  disabled,
  onMark,
}: {
  label: string;
  clientName: string;
  today: string;
  disabled: boolean;
  onMark: (date: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(today);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            size="sm"
            variant="outline"
            disabled={disabled}
            aria-label={`Mark ${label} for ${clientName}`}
            title={disabled ? "Already marked" : undefined}
          />
        }
      >
        <CheckCheck className="size-4" />
        Mark year
      </PopoverTrigger>
      <PopoverContent align="end" className="grid w-72 gap-3">
        <p className="text-sm">
          Mark <span className="font-medium">{label}</span> as advised for{" "}
          <span className="font-medium">{clientName}</span>. Periods already marked are left as they are.
        </p>
        <div className="grid gap-1.5">
          <span className="text-xs text-muted-foreground">Advised on</span>
          <DatePicker value={date} onChange={setDate} max={today} ariaLabel="Advice date" />
        </div>
        <Button
          onClick={() => {
            setOpen(false);
            onMark(date);
          }}
        >
          Mark as advised
        </Button>
      </PopoverContent>
    </Popover>
  );
}
