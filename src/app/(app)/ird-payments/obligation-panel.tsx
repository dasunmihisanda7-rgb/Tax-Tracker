"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/date-picker";
import { SimpleSelect } from "@/components/simple-select";
import {
  PAID_BY,
  fundingLabel,
  paidByLabel,
  paymentModeLabel,
  type PaidBy,
  type TaxType,
} from "@/lib/constants";
import { formatAmount, formatDate } from "@/lib/format";
import { parseAmount } from "@/lib/money";
import { addPayment, deletePayment, updatePayment } from "@/lib/payments/actions";
import type { GridCell, GridPayment } from "./payment-grid";

type FormState = { paid_on: string; amount: string; paid_by: PaidBy; ref_no: string; note: string };

/** Side panel body: totals, receipts, payments (edit / delete) and the add-payment form. */
export function ObligationPanel({
  clientId,
  taxType,
  periodId,
  cell,
  today,
}: {
  clientId: string;
  taxType: TaxType;
  periodId: string;
  cell: GridCell | undefined;
  today: string;
}) {
  const blank = (): FormState => ({ paid_on: today, amount: "", paid_by: "firm", ref_no: "", note: "" });
  const [editing, setEditing] = useState<GridPayment | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const receipts = cell?.receipts ?? [];
  const payments = cell?.payments ?? [];
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const startEdit = (p: GridPayment) => {
    setEditing(p);
    setErrors({});
    setForm({
      paid_on: p.paid_on,
      amount: formatAmount(p.amount),
      paid_by: p.paid_by,
      ref_no: p.ref_no ?? "",
      note: p.note ?? "",
    });
  };
  const cancelEdit = () => {
    setEditing(null);
    setErrors({});
    setForm(blank());
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const input = { client_id: clientId, tax_type: taxType, period_id: periodId, ...form };
    startTransition(async () => {
      const res = editing ? await updatePayment(editing.id, input) : await addPayment(input);
      if (!res.ok) {
        setErrors({ ...(res.fieldErrors ?? {}), _form: res.error });
        return;
      }
      toast.success(editing ? "Payment updated." : "Payment recorded.");
      setEditing(null);
      setForm(blank());
    });
  };

  const remove = (id: string) =>
    startTransition(async () => {
      const res = await deletePayment(id);
      setConfirmDelete(null);
      if (res.ok) {
        toast.success("Payment deleted.");
        if (editing?.id === id) cancelEdit();
      } else toast.error(res.error);
    });

  const err = (k: string) =>
    errors[k] ? (
      <p role="alert" className="text-sm text-destructive">
        {errors[k]}
      </p>
    ) : null;

  return (
    <div className="grid gap-6 px-4 pb-6">
      <dl className="grid grid-cols-3 gap-2 rounded-lg border p-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Received</dt>
          <dd className="tabular-nums" data-panel-received>{formatAmount(cell?.received ?? 0)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Paid to IRD</dt>
          <dd className="tabular-nums" data-panel-paid>{formatAmount(cell?.paid ?? 0)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Balance held</dt>
          <dd className="tabular-nums font-medium" data-panel-balance>{formatAmount(cell?.balance ?? 0)}</dd>
        </div>
      </dl>

      <section className="grid gap-2">
        <h3 className="text-sm font-medium">Receipts from the client ({receipts.length})</h3>
        {receipts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            None.{" "}
            <Link href="/client-receipts/new" className="underline">
              Add a receipt
            </Link>
          </p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {receipts.map((r) => (
              <li key={r.id} className="flex justify-between gap-3 px-3 py-2">
                <span>
                  {formatDate(r.received_on)} · {paymentModeLabel(r.payment_mode)}
                  {r.ref_no ? ` ${r.ref_no}` : ""}
                  <span className="block text-xs text-muted-foreground">
                    {fundingLabel(r.funding_method)} · entered by {r.entered_by}
                  </span>
                </span>
                <span className="tabular-nums">{formatAmount(r.amount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid gap-2">
        <h3 className="text-sm font-medium">Payments to the IRD ({payments.length})</h3>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="divide-y rounded-lg border text-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-3 px-3 py-2" data-panel-payment>
                <span>
                  {formatDate(p.paid_on)} · {paidByLabel(p.paid_by)}
                  {p.ref_no ? ` · ${p.ref_no}` : ""}
                  <span className="block text-xs text-muted-foreground">
                    entered by {p.entered_by}
                    {p.note ? ` · ${p.note}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="tabular-nums">{formatAmount(p.amount)}</span>
                  {confirmDelete === p.id ? (
                    <>
                      <Button size="xs" variant="destructive" disabled={pending} onClick={() => remove(p.id)}>
                        Delete
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => setConfirmDelete(null)}>
                        Keep
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="icon-xs" variant="ghost" aria-label="Edit payment" onClick={() => startEdit(p)}>
                        <Pencil />
                      </Button>
                      <Button
                        size="icon-xs"
                        variant="ghost"
                        aria-label="Delete payment"
                        onClick={() => setConfirmDelete(p.id)}
                      >
                        <Trash2 />
                      </Button>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={submit} noValidate className="grid gap-3 rounded-lg border p-3">
        <h3 className="text-sm font-medium">{editing ? "Edit payment" : "Add a payment"}</h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="paid_on">Date paid</Label>
            <DatePicker id="paid_on" value={form.paid_on} onChange={(d) => set("paid_on", d)} max={today} className="w-full" />
            {err("paid_on")}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pay_amount">Amount (Rs)</Label>
            <Input
              id="pay_amount"
              inputMode="decimal"
              value={form.amount}
              onChange={(e) => set("amount", e.target.value)}
              onBlur={() => {
                const n = parseAmount(form.amount);
                if (n !== null) set("amount", formatAmount(n));
              }}
              className="text-right tabular-nums"
              placeholder="0.00"
              aria-invalid={Boolean(errors.amount) || undefined}
            />
            {err("amount")}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="paid_by">Paid by</Label>
            <SimpleSelect
              id="paid_by"
              value={form.paid_by}
              onChange={(v) => set("paid_by", v as PaidBy)}
              options={PAID_BY}
              className="w-full"
            />
            {err("paid_by")}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pay_ref">Reference (optional)</Label>
            <Input id="pay_ref" value={form.ref_no} onChange={(e) => set("ref_no", e.target.value)} />
          </div>
        </div>
        {form.paid_by === "client_direct" && (
          <p className="text-xs text-muted-foreground">
            Paid by the client directly: shown as paid, but not counted against money the firm holds.
          </p>
        )}
        <div className="grid gap-1.5">
          <Label htmlFor="pay_note">Note (optional)</Label>
          <Textarea id="pay_note" rows={2} value={form.note} onChange={(e) => set("note", e.target.value)} />
        </div>
        {errors._form && !Object.keys(errors).some((k) => k !== "_form") && err("_form")}
        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : editing ? "Save changes" : "Add payment"}
          </Button>
          {editing && (
            <Button type="button" variant="outline" onClick={cancelEdit}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
