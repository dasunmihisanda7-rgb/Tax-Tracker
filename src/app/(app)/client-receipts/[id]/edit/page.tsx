import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { FormSkeleton } from "@/components/skeletons";
import { createClient } from "@/lib/supabase/server";
import { colomboTodayIso, formatAmount } from "@/lib/format";
import { loadEntryFormData } from "@/lib/receipts/form-data";
import { ReceiptForm } from "../../receipt-form";

export default function EditReceiptPage({ params }: PageProps<"/client-receipts/[id]/edit">) {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Edit receipt"
        description="Changes one receipt row. Other rows with the same reference number are not changed."
        back={{ href: "/client-receipts", label: "Client Receipts" }}
      />
      <Suspense fallback={<FormSkeleton />}>
        <EditReceipt params={params} />
      </Suspense>
    </div>
  );
}

async function EditReceipt({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("client_receipts")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!r) notFound();
  const { clients, periods } = await loadEntryFormData(r.client_id);

  return (
    <ReceiptForm
      receiptId={r.id}
      clients={clients}
      periods={periods}
      today={colomboTodayIso()}
      initial={{
        client_id: r.client_id,
        received_on: r.received_on,
        funding_method: r.funding_method,
        payment_mode: r.payment_mode,
        ref_no: r.ref_no ?? "",
        note: r.note ?? "",
        lines: [{ tax_type: r.tax_type, period_id: r.period_id, amount: formatAmount(r.amount) }],
      }}
    />
  );
}
