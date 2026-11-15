import { PageHeader } from "@/components/page-header";
import { ClientForm, EMPTY_CLIENT } from "../client-form";

export default function NewClientPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title="Add client" back={{ href: "/clients", label: "Clients" }} />
      <ClientForm initial={EMPTY_CLIENT} />
    </div>
  );
}
