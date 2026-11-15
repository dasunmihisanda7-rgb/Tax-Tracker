import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { FormSkeleton } from "@/components/skeletons";
import { createClient } from "@/lib/supabase/server";
import { ClientForm } from "../../client-form";

export default function EditClientPage({ params }: PageProps<"/clients/[id]/edit">) {
  return (
    <Suspense fallback={<FormSkeleton />}>
      <EditClient params={params} />
    </Suspense>
  );
}

async function EditClient({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("clients")
    .select("*, client_tax_types(tax_type, is_active)")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!c) notFound();

  return (
    <div className="grid gap-6">
      <PageHeader title={`Edit ${c.name}`} back={{ href: `/clients/${c.id}`, label: c.name }} />
      <ClientForm
        initial={{
          id: c.id,
          name: c.name,
          client_type: c.client_type,
          contact_person: c.contact_person ?? "",
          email: c.email ?? "",
          phone: c.phone ?? "",
          tin: c.tin ?? "",
          notes: c.notes ?? "",
          is_active: c.is_active,
          tax_types: c.client_tax_types.filter((t) => t.is_active).map((t) => t.tax_type),
        }}
      />
    </div>
  );
}
