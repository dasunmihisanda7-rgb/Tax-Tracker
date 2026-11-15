import { PageHeader } from "@/components/page-header";
import { ImportForm } from "./import-form";

export default function ImportClientsPage() {
  return (
    <div className="grid gap-6">
      <PageHeader
        title="Bulk add clients"
        description="Paste or upload a CSV of client name, client type and tax types to enter the starting list."
        back={{ href: "/clients", label: "Clients" }}
      />
      <ImportForm />
    </div>
  );
}
