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
import { ExportButton } from "@/components/export-button";
import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/skeletons";
import { clientTypeLabel } from "@/lib/constants";
import { loadClients } from "@/lib/data/clients";
import type { SearchParams } from "@/lib/data/params";
import { ClientFilters } from "./client-filters";

export default function ClientsPage({ searchParams }: PageProps<"/clients">) {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Clients"
        description="Everyone the firm advises, and the tax types each one pays."
        actions={
          <>
            <Suspense>
              <ExportButton kind="clients" />
            </Suspense>
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
      <Suspense fallback={<TableSkeleton />}>
        <ClientsTable searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ClientsTable({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { clients, filtered, error } = await loadClients(await searchParams);
  if (error) {
    return <p className="text-sm text-destructive">Could not load clients: {error}</p>;
  }

  if (clients.length === 0) {
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
