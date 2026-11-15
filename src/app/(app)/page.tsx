import { Suspense } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, HandCoins, TriangleAlert, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { createClient } from "@/lib/supabase/server";
import { TAX_TYPES, taxFamily, type PeriodFamily, type TaxType } from "@/lib/constants";
import { colomboTodayIso, dateToIso, formatAmount, formatDate, isoToDate } from "@/lib/format";
import { notAdvisedHref } from "@/lib/links";

export default function DashboardPage() {
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader title="Dashboard" description="What still needs doing: advice to send, money to pay, money to recover." />
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

type Period = { id: string; family: PeriodFamily; code: string; label: string; year_key: string; due_date: string };

async function Dashboard() {
  const supabase = await createClient();
  const today = colomboTodayIso();
  const in14 = (() => {
    const d = isoToDate(today);
    d.setDate(d.getDate() + 14);
    return dateToIso(d);
  })();

  const [upcomingRes, moneyRes] = await Promise.all([
    supabase
      .from("tax_periods")
      .select("id, family, code, label, year_key, due_date")
      .is("deleted_at", null)
      .gte("due_date", today)
      .order("due_date")
      .order("sort_order"),
    supabase
      .from("obligation_status")
      .select("money_status, balance")
      .in("money_status", ["payment_pending", "to_recover"]),
  ]);
  const upcoming = (upcomingRes.data ?? []) as Period[];

  // The next period falling due (today or later) in each family.
  const nextDue: Record<PeriodFamily, Period | undefined> = {
    income: upcoming.find((p) => p.family === "income"),
    monthly: upcoming.find((p) => p.family === "monthly"),
  };
  const dueSoon = upcoming.filter((p) => p.due_date <= in14);

  // Advice status for the next-due periods and every period due in the next 14 days.
  const periodIds = [...new Set([nextDue.income?.id, nextDue.monthly?.id, ...dueSoon.map((p) => p.id)])].filter(
    Boolean,
  ) as string[];
  const { data: adviceRows } = periodIds.length
    ? await supabase
        .from("obligation_status")
        .select("tax_type, period_id, is_advised")
        .in("period_id", periodIds)
        .eq("client_is_active", true)
    : { data: [] };
  const advice = adviceRows ?? [];
  const countFor = (periodId: string, taxType?: TaxType) => {
    const rows = advice.filter((r) => r.period_id === periodId && (!taxType || r.tax_type === taxType));
    return { total: rows.length, notAdvised: rows.filter((r) => !r.is_advised).length };
  };

  const held = (moneyRes.data ?? []).filter((r) => r.money_status === "payment_pending");
  const recover = (moneyRes.data ?? []).filter((r) => r.money_status === "to_recover");
  const heldTotal = held.reduce((s, r) => s + Number(r.balance), 0);
  const recoverTotal = recover.reduce((s, r) => s - Number(r.balance), 0);

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr]">
        <Card data-card="not-advised">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" />
              Not yet advised
            </CardTitle>
            <CardDescription>For the next period due, per tax type.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1">
              {TAX_TYPES.map((t) => {
                const period = nextDue[taxFamily(t.code)];
                if (!period) {
                  return (
                    <li key={t.code} className="text-sm text-muted-foreground">
                      {t.code}: no upcoming period. Generate periods in Settings.
                    </li>
                  );
                }
                const c = countFor(period.id, t.code);
                return (
                  <li key={t.code}>
                    <Link
                      href={notAdvisedHref(t.code, period.year_key, period.code)}
                      className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                      data-not-advised={`${t.code}|${period.code}|${c.notAdvised}|${c.total}`}
                    >
                      <span>
                        <span className="font-medium">{t.code}</span>{" "}
                        <span className="font-mono text-xs">{period.code}</span>{" "}
                        <span className="text-xs text-muted-foreground">due {formatDate(period.due_date)}</span>
                      </span>
                      <span
                        className={`whitespace-nowrap ${c.notAdvised ? "font-semibold text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}
                      >
                        {c.total === 0 ? "no clients" : `${c.notAdvised} of ${c.total} not advised`}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>

        <MoneyCard
          testId="held"
          icon={<HandCoins className="size-4" />}
          title="Money held, IRD payment not made"
          description="Client money in hand, awaiting payment to the IRD."
          count={held.length}
          total={heldTotal}
          href="/outstanding?tab=pending"
          tone="amber"
        />
        <MoneyCard
          testId="recover"
          icon={<TriangleAlert className="size-4" />}
          title="To recover from clients"
          description="The firm paid the IRD; the client still owes the firm."
          count={recover.length}
          total={recoverTotal}
          href="/outstanding?tab=recover"
          tone="red"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="size-4" />
            Falling due in the next 14 days
          </CardTitle>
          <CardDescription>
            {formatDate(today)} to {formatDate(in14)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dueSoon.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing falls due in the next 14 days.</p>
          ) : (
            <ul className="divide-y">
              {dueSoon.map((p) => {
                const types = TAX_TYPES.filter((t) => t.family === p.family);
                return (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm" data-due={p.code}>
                    <span>
                      <span className="font-medium tabular-nums">{formatDate(p.due_date)}</span>
                      {p.due_date === today && (
                        <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                          today
                        </span>
                      )}{" "}
                      · <span className="font-mono">{p.code}</span> {p.label}
                    </span>
                    <span className="flex flex-wrap gap-2">
                      {types.map((t) => {
                        const c = countFor(p.id, t.code);
                        if (c.total === 0) return null;
                        return (
                          <Link
                            key={t.code}
                            href={notAdvisedHref(t.code, p.year_key, p.code)}
                            className="rounded-md border px-2 py-0.5 text-xs hover:bg-muted"
                          >
                            {t.code}: {c.notAdvised ? `${c.notAdvised} not advised` : "all advised"}
                          </Link>
                        );
                      })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MoneyCard({
  testId,
  icon,
  title,
  description,
  count,
  total,
  href,
  tone,
}: {
  testId: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  count: number;
  total: number;
  href: string;
  tone: "amber" | "red";
}) {
  const color =
    count === 0
      ? "text-muted-foreground"
      : tone === "amber"
        ? "text-amber-700 dark:text-amber-400"
        : "text-red-700 dark:text-red-400";
  return (
    <Card data-card={testId}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div>
          <div className={`text-2xl font-semibold tabular-nums ${color}`} data-amount>
            Rs {formatAmount(total)}
          </div>
          <div className="text-sm text-muted-foreground" data-count>
            {count} {count === 1 ? "obligation" : "obligations"}
          </div>
        </div>
        <Link href={href} className="flex w-fit items-center gap-1 text-sm font-medium hover:underline">
          View in Outstanding
          <ArrowRight className="size-3.5" />
        </Link>
      </CardContent>
    </Card>
  );
}
