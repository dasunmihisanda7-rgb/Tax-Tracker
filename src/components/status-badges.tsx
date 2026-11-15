import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatDate, formatRs } from "@/lib/format";
import type { MoneyStatus } from "@/lib/constants";

/** Advice badge (PLAN.md section 4). Hovering an "Advised" badge shows the date and who marked it. */
export function AdviceBadge({
  advised,
  advisedOn,
  advisedBy,
}: {
  advised: boolean;
  advisedOn?: string | null;
  advisedBy?: string | null;
}) {
  if (!advised) {
    return (
      <Badge variant="outline" className="border-amber-300 text-amber-800 dark:text-amber-300">
        Not advised
      </Badge>
    );
  }
  return (
    <Tooltip>
      <TooltipTrigger render={<span />}>
        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
          Advised
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        Advised on {formatDate(advisedOn)}
        {advisedBy ? ` by ${advisedBy}` : ""}
      </TooltipContent>
    </Tooltip>
  );
}

const MONEY_STYLES: Record<MoneyStatus, string> = {
  no_activity: "bg-muted text-muted-foreground",
  payment_pending: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  to_recover: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  settled: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
};

/** Money badge (PLAN.md section 4), driven by obligation_status.money_status and balance. */
export function MoneyBadge({ status, balance }: { status: MoneyStatus; balance: number }) {
  const text =
    status === "payment_pending"
      ? `Payment pending, ${formatRs(balance)} held`
      : status === "to_recover"
        ? `To recover, ${formatRs(Math.abs(balance))}`
        : status === "settled"
          ? "Settled"
          : "No activity";
  return <Badge className={cn("font-medium", MONEY_STYLES[status])}>{text}</Badge>;
}
