"use client";

import { useMemo, useState, useTransition } from "react";
import { FreshOnNavigation } from "@/components/fresh-on-navigation";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/date-picker";
import { OptionCombobox } from "@/components/option-combobox";
import { SimpleSelect } from "@/components/simple-select";
import { cn } from "@/lib/utils";
import {
  FUNDING_METHODS,
  PAYMENT_MODES,
  taxFamily,
  type FundingMethod,
  type PaymentMode,
  type TaxType,
} from "@/lib/constants";
import { formatAmount } from "@/lib/format";
import { parseAmount } from "@/lib/money";
import type { FormClient, FormPeriod } from "@/lib/receipts/form-data";
import { addReceipt, updateReceipt } from "@/lib/receipts/actions";

type Line = { key: number; tax_type: TaxType | null; period_id: string | null; amount: string };

export type ReceiptFormValues = {
  client_id: string | null;
  received_on: string;
  funding_method: FundingMethod | null;
  payment_mode: PaymentMode | null;
  ref_no: string;
  note: string;
  lines: Omit<Line, "key">[];
};

export function ReceiptForm(props: React.ComponentProps<typeof ReceiptFormInner>) {
  return (
    <FreshOnNavigation>
      <ReceiptFormInner {...props} />
    </FreshOnNavigation>
  );
}

function ReceiptFormInner({
  clients,
  periods,
  initial,
  receiptId,
  today,
}: {
  clients: FormClient[];
  periods: FormPeriod[];
  initial: ReceiptFormValues;
  receiptId?: string;
  today: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(receiptId);
  const [pending, startTransition] = useTransition();
  const [clientId, setClientId] = useState(initial.client_id);
  const [receivedOn, setReceivedOn] = useState(initial.received_on);
  const [funding, setFunding] = useState(initial.funding_method);
  const [mode, setMode] = useState(initial.payment_mode);
  const [refNo, setRefNo] = useState(initial.ref_no);
  const [note, setNote] = useState(initial.note);
  const [lines, setLines] = useState<Line[]>(initial.lines.map((l, i) => ({ ...l, key: i })));
  const [nextKey, setNextKey] = useState(initial.lines.length);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const client = clients.find((c) => c.id === clientId) ?? null;
  const clientOptions = useMemo(() => clients.map((c) => ({ value: c.id, label: c.name })), [clients]);
  const periodOptions = (t: TaxType | null) =>
    t
      ? periods
          .filter((p) => p.family === taxFamily(t))
          .map((p) => ({ value: p.id, label: `${p.code} · ${p.label} · ${p.year_key}` }))
      : [];

  const setLine = (key: number, patch: Partial<Line>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const changeClient = (id: string | null) => {
    setClientId(id);
    const c = clients.find((x) => x.id === id);
    // Keep lines whose tax type the new client also pays; preselect when there is only one.
    setLines((ls) =>
      ls.map((l) => {
        if (l.tax_type && c?.taxTypes.includes(l.tax_type)) return l;
        return { ...l, tax_type: c?.taxTypes.length === 1 ? c.taxTypes[0] : null, period_id: null };
      }),
    );
  };

  const addLine = () => {
    const last = lines[lines.length - 1];
    setLines((ls) => [
      ...ls,
      { key: nextKey, tax_type: last?.tax_type ?? client?.taxTypes[0] ?? null, period_id: null, amount: "" },
    ]);
    setNextKey((k) => k + 1);
  };

  const total = lines.reduce((s, l) => s + (parseAmount(l.amount) ?? 0), 0);
  const needsRef = mode !== null && mode !== "cash";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setFormError(null);
    const input = {
      client_id: clientId ?? "",
      received_on: receivedOn,
      funding_method: funding as FundingMethod,
      payment_mode: mode as PaymentMode,
      ref_no: refNo,
      note,
      lines: lines.map((l) => ({
        tax_type: l.tax_type as TaxType,
        period_id: l.period_id ?? "",
        amount: l.amount,
      })),
    };
    startTransition(async () => {
      const res = isEdit ? await updateReceipt(receiptId!, input) : await addReceipt(input);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
        return;
      }
      toast.success(
        isEdit ? "Receipt updated." : `Receipt saved as ${res.count} ${res.count === 1 ? "row" : "rows"}.`,
      );
      router.push(refNo.trim() ? `/client-receipts?ref=${encodeURIComponent(refNo.trim())}` : "/client-receipts");
    });
  };

  const err = (key: string) =>
    errors[key] ? (
      <p role="alert" className="text-sm text-destructive">
        {errors[key]}
      </p>
    ) : null;

  return (
    <form onSubmit={submit} noValidate className="grid max-w-4xl gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="client">Client</Label>
          <OptionCombobox
            id="client"
            value={clientId}
            onChange={changeClient}
            options={clientOptions}
            placeholder="Search clients…"
            invalid={Boolean(errors.client_id)}
          />
          {err("client_id")}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="received_on">Date received</Label>
          <DatePicker id="received_on" value={receivedOn} onChange={setReceivedOn} max={today} className="w-full" />
          {err("received_on")}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="funding_method">Funding method</Label>
          <SimpleSelect
            id="funding_method"
            value={funding}
            onChange={(v) => setFunding(v as FundingMethod)}
            options={FUNDING_METHODS.map((f) => ({ value: f.value, label: f.label }))}
            placeholder="Choose…"
            invalid={Boolean(errors.funding_method)}
            className="w-full"
          />
          {funding && (
            <p className="text-xs text-muted-foreground">
              {FUNDING_METHODS.find((f) => f.value === funding)?.hint}
            </p>
          )}
          {err("funding_method")}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="payment_mode">Payment mode</Label>
          <SimpleSelect
            id="payment_mode"
            value={mode}
            onChange={(v) => setMode(v as PaymentMode)}
            options={PAYMENT_MODES}
            placeholder="Choose…"
            invalid={Boolean(errors.payment_mode)}
            className="w-full"
          />
          {err("payment_mode")}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="ref_no">
            Reference number {needsRef ? "" : <span className="font-normal text-muted-foreground">(optional)</span>}
          </Label>
          <Input
            id="ref_no"
            value={refNo}
            onChange={(e) => setRefNo(e.target.value)}
            placeholder={mode === "cheque" ? "Cheque number" : mode === "online_transfer" ? "Transfer reference" : ""}
            aria-invalid={Boolean(errors.ref_no) || undefined}
          />
          {err("ref_no")}
        </div>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-medium">
          {isEdit ? "Line" : "Lines (one per tax type and period this payment covers)"}
        </legend>
        {!client && <p className="text-sm text-muted-foreground">Choose the client first.</p>}
        {client && (
          <div className="grid gap-2">
            <div className="hidden grid-cols-[8rem_1fr_10rem_2.5rem] gap-2 text-xs text-muted-foreground sm:grid">
              <span>Tax type</span>
              <span>Period</span>
              <span className="text-right">Amount (Rs)</span>
              <span />
            </div>
            {lines.map((l, i) => (
              <div key={l.key} className="grid gap-2 sm:grid-cols-[8rem_1fr_10rem_2.5rem] sm:items-start" data-line={i}>
                <div className="grid gap-1">
                  <SimpleSelect
                    ariaLabel={`Line ${i + 1} tax type`}
                    value={l.tax_type}
                    onChange={(v) => setLine(l.key, { tax_type: v as TaxType, period_id: null })}
                    options={client.taxTypes.map((t) => ({ value: t, label: t }))}
                    placeholder="Tax type"
                    invalid={Boolean(errors[`lines.${i}.tax_type`])}
                    className="w-full min-w-0"
                  />
                  {err(`lines.${i}.tax_type`)}
                </div>
                <div className="grid gap-1">
                  <OptionCombobox
                    key={`${l.key}:${l.tax_type}`}
                    ariaLabel={`Line ${i + 1} period`}
                    value={l.period_id}
                    onChange={(v) => setLine(l.key, { period_id: v })}
                    options={periodOptions(l.tax_type)}
                    placeholder={l.tax_type ? "Search period code…" : "Choose the tax type first"}
                    invalid={Boolean(errors[`lines.${i}.period_id`])}
                  />
                  {err(`lines.${i}.period_id`)}
                </div>
                <div className="grid gap-1">
                  <Input
                    aria-label={`Line ${i + 1} amount`}
                    inputMode="decimal"
                    value={l.amount}
                    onChange={(e) => setLine(l.key, { amount: e.target.value })}
                    onBlur={() => {
                      const n = parseAmount(l.amount);
                      if (n !== null) setLine(l.key, { amount: formatAmount(n) });
                    }}
                    className="text-right tabular-nums"
                    placeholder="0.00"
                    aria-invalid={Boolean(errors[`lines.${i}.amount`]) || undefined}
                  />
                  {err(`lines.${i}.amount`)}
                </div>
                {!isEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove line ${i + 1}`}
                    disabled={lines.length === 1}
                    onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            ))}
            <div className="flex items-center justify-between gap-2 border-t pt-3">
              {!isEdit ? (
                <Button type="button" variant="outline" size="sm" onClick={addLine}>
                  <Plus className="size-4" />
                  Add another line
                </Button>
              ) : (
                <span />
              )}
              <span className={cn("text-sm tabular-nums", lines.length > 1 && "font-medium")}>
                Total Rs {formatAmount(total)}
              </span>
            </div>
            {err("lines")}
          </div>
        )}
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea id="note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        {err("note")}
      </div>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Save receipt"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
