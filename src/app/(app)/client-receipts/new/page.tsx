import { Suspense } from "react";
import { PageHeader } from "@/components/page-header";
import { colomboTodayIso } from "@/lib/format";
import { loadEntryFormData } from "@/lib/receipts/form-data";
import { ReceiptForm } from "../receipt-form";

export default function NewReceiptPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Add receipt"
        description="Money a client gave the firm. One cheque or transfer covering several periods goes on several lines."
        back={{ href: "/client-receipts", label: "Client Receipts" }}
      />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <NewReceipt />
      </Suspense>
    </div>
  );
}

async function NewReceipt() {
  const { clients, periods } = await loadEntryFormData();
  const today = colomboTodayIso();
  return (
    <ReceiptForm
      clients={clients}
      periods={periods}
      today={today}
      initial={{
        client_id: null,
        received_on: today,
        funding_method: "client_paid_first",
        payment_mode: null,
        ref_no: "",
        note: "",
        lines: [{ tax_type: null, period_id: null, amount: "" }],
      }}
    />
  );
}
