"use client";

import { useState, useTransition } from "react";
import { FreshOnNavigation } from "@/components/fresh-on-navigation";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SimpleSelect } from "@/components/simple-select";
import { CLIENT_TYPES, TAX_TYPES, type ClientType, type TaxType } from "@/lib/constants";
import { saveClient } from "@/lib/clients/actions";

export type ClientFormValues = {
  id: string | null;
  name: string;
  client_type: ClientType | null;
  contact_person: string;
  email: string;
  phone: string;
  tin: string;
  notes: string;
  is_active: boolean;
  tax_types: TaxType[];
};

export const EMPTY_CLIENT: ClientFormValues = {
  id: null,
  name: "",
  client_type: null,
  contact_person: "",
  email: "",
  phone: "",
  tin: "",
  notes: "",
  is_active: true,
  tax_types: [],
};

const CLIENT_TYPE_OPTIONS = CLIENT_TYPES.map((t) => ({ value: t.value, label: t.label }));

export function ClientForm(props: { initial: ClientFormValues }) {
  return (
    <FreshOnNavigation>
      <ClientFormInner {...props} />
    </FreshOnNavigation>
  );
}

function ClientFormInner({ initial }: { initial: ClientFormValues }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<{ message: string; field?: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const isEdit = initial.id !== null;

  const set = <K extends keyof ClientFormValues>(key: K, value: ClientFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }));

  const toggleTax = (code: TaxType, on: boolean) =>
    set("tax_types", on ? [...values.tax_types, code] : values.tax_types.filter((t) => t !== code));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveClient({
        ...values,
        client_type: values.client_type as ClientType,
      });
      if (!result.ok) {
        setError({ message: result.error, field: result.field });
        return;
      }
      toast.success(isEdit ? "Client updated." : "Client added.");
      router.push(`/clients/${result.id}`);
    });
  };

  const fieldError = (field: string) =>
    error?.field === field ? (
      <p role="alert" className="text-sm text-destructive">
        {error.message}
      </p>
    ) : null;

  return (
    <form onSubmit={onSubmit} className="grid max-w-2xl gap-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="name">Client name</Label>
          <Input
            id="name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            aria-invalid={error?.field === "name" || undefined}
            autoFocus={!isEdit}
            required
          />
          {fieldError("name")}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="client_type">Client type</Label>
          <SimpleSelect
            id="client_type"
            value={values.client_type}
            onChange={(v) => set("client_type", v as ClientType)}
            options={CLIENT_TYPE_OPTIONS}
            placeholder="Choose…"
            invalid={error?.field === "client_type"}
            className="w-full"
          />
          {fieldError("client_type")}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="tin">TIN (optional)</Label>
          <Input id="tin" value={values.tin} onChange={(e) => set("tin", e.target.value)} />
          {fieldError("tin")}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="contact_person">Contact person</Label>
          <Input
            id="contact_person"
            value={values.contact_person}
            onChange={(e) => set("contact_person", e.target.value)}
          />
          {fieldError("contact_person")}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" value={values.phone} onChange={(e) => set("phone", e.target.value)} />
          {fieldError("phone")}
        </div>

        <div className="grid gap-2 sm:col-span-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={values.email}
            onChange={(e) => set("email", e.target.value)}
            aria-invalid={error?.field === "email" || undefined}
          />
          {fieldError("email")}
        </div>
      </div>

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-medium">Tax types this client pays</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {TAX_TYPES.map((t) => {
            const id = `tax-${t.code}`;
            return (
              <label key={t.code} htmlFor={id} className="flex items-center gap-3 rounded-lg border p-3">
                <Checkbox
                  id={id}
                  checked={values.tax_types.includes(t.code)}
                  onCheckedChange={(on) => toggleTax(t.code, on === true)}
                />
                <span className="grid">
                  <span className="text-sm font-medium">{t.code}</span>
                  <span className="text-xs text-muted-foreground">
                    {t.name} · {t.family === "income" ? "instalments" : "monthly"}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {fieldError("tax_types")}
        {isEdit && (
          <p className="text-xs text-muted-foreground">
            Unticking a tax type hides it from the screens. Its existing records are kept.
          </p>
        )}
      </fieldset>

      <div className="grid gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" rows={3} value={values.notes} onChange={(e) => set("notes", e.target.value)} />
        {fieldError("notes")}
      </div>

      {isEdit && (
        <label htmlFor="is_active" className="flex items-center gap-3">
          <Switch
            id="is_active"
            checked={values.is_active}
            onCheckedChange={(on) => set("is_active", on === true)}
          />
          <span className="text-sm">Active client</span>
        </label>
      )}

      {error && !error.field && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : isEdit ? "Save changes" : "Add client"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
