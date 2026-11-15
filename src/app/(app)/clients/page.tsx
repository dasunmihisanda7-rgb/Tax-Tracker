import { Suspense } from "react";
import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { TAX_TYPES, clientTypeLabel, type TaxType } from "@/lib/constants";
import { ClientFilters } from "./client-filters";

export default function ClientsPage({ searchParams }: PageProps<"/clients">) {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Clients"
        description="Everyone the firm advises, and the tax types each one pays."
        actions={
          <>
            <Link href="/clients/import" className={buttonVariants({ variant: "outline" })}>
              <Upload className="size-4" />
              Bulk add
            </Link>
            <Link href="/clients/new" className={buttonVariants()}>
              <Plus className="size-4" />
              Add client
            </Link>
          </>
        }
      />
      <Suspense>
        <ClientFilters />
      </Suspense>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading clients…</p>}>
        <ClientsTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

async function ClientsTable({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  // Characters with meaning in PostgREST's or() syntax become the * wildcard ("match anything").
  const q = first(sp.q).trim().replace(/[,()*%\\:"']/g, "*");
  const tax = first(sp.tax) as TaxType | "";
  const status = first(sp.status) || "active";

  const supabase = await createClient();
  let query = supabase
    .from("clients")
    .select("id, name, client_type, contact_person, phone, tin, is_active, client_tax_types(tax_type, is_active)")
    .is("deleted_at", null)
    .order("name");
  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);
  if (q) query = query.or(`name.ilike.*${q}*,contact_person.ilike.*${q}*,tin.ilike.*${q}*`);

  const { data, error } = await query;
  if (error) {
    return <p className="text-sm text-destructive">Could not load clients: {error.message}</p>;
  }

  const order = TAX_TYPES.map((t) => t.code);
  const clients = data
    .map((c) => ({
      ...c,
      taxTypes: c.client_tax_types
        .filter((t) => t.is_active)
        .map((t) => t.tax_type)
        .sort((a, b) => order.indexOf(a) - order.indexOf(b)),
    }))
    .filter((c) => !tax || c.taxTypes.includes(tax));

  if (clients.length === 0) {
    const filtered = Boolean(q || tax || status !== "active");
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="font-medium">{filtered ? "No clients match these filters." : "No clients yet."}</p>
        {!filtered && (
          <p className="mt-1 text-sm text-muted-foreground">
            Add clients one by one, or use Bulk add to paste the starting list.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Tax types</TableHead>
              <TableHead>Contact person</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>TIN</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">
                  <Link href={`/clients/${c.id}`} className="hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{clientTypeLabel(c.client_type)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {c.taxTypes.map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{c.contact_person}</TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell>{c.tin}</TableCell>
                <TableCell>
                  {c.is_active ? (
                    <span className="text-sm">Active</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Inactive</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">
        {clients.length} {clients.length === 1 ? "client" : "clients"}
      </p>
    </div>
  );
}
