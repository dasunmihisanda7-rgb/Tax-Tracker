import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="grid max-w-lg gap-3 rounded-lg border p-6">
      <h1 className="text-lg font-semibold">Not found</h1>
      <p className="text-sm text-muted-foreground">
        This record doesn&apos;t exist or was deleted. Deleted records are kept in the audit log but no longer appear on
        screens.
      </p>
      <div>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          Back to the dashboard
        </Link>
      </div>
    </div>
  );
}
