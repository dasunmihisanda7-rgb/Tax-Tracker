import { Suspense } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/page-header";
import { TableSkeleton } from "@/components/skeletons";
import { UrlSelect } from "@/components/url-controls";
import { createClient } from "@/lib/supabase/server";
import { yearKeys } from "@/lib/constants";
import { first, type SearchParams } from "@/lib/data/params";
import { colomboYear, formatDateTime } from "@/lib/format";
import { DueDateEditor, GeneratePeriods } from "./settings-controls";

export default function SettingsPage({ searchParams }: PageProps<"/settings">) {
  return (
    <div className="grid min-w-0 gap-6">
      <PageHeader title="Settings" description="Tax periods, due dates and staff accounts." />
      <Suspense fallback={<TableSkeleton rows={8} />}>
        <SettingsScreen searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function SettingsScreen({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const [periodsRes, profilesRes] = await Promise.all([
    supabase
      .from("tax_periods")
      .select("id, family, code, label, year_key, sort_order, due_date")
      .is("deleted_at", null)
      .order("sort_order"),
    supabase.from("profiles").select("id, full_name, email, created_at").is("deleted_at", null).order("full_name"),
  ]);
  const periods = periodsRes.data ?? [];

  // A "year" Y is complete when both income Y/Y+1 (5 codes) and monthly Y (12 codes) exist.
  const countFor = (y: number) => {
    const k = yearKeys(y);
    return periods.filter((p) => p.year_key === k.income || p.year_key === k.monthly).length;
  };
  const existing = [...new Set(periods.map((p) => Number(p.year_key.slice(0, 4))))].sort((a, b) => b - a);
  const thisYear = colomboYear();
  const candidates = [...new Set([...existing, thisYear - 2, thisYear - 1, thisYear, thisYear + 1, thisYear + 2])]
    .sort((a, b) => b - a)
    .map((y) => ({ value: y, done: countFor(y) >= 17 }));
  const nextMissing = candidates.filter((c) => !c.done).sort((a, b) => a.value - b.value).find((c) => c.value >= thisYear);

  const editYear = existing.includes(Number(first(sp.year))) ? Number(first(sp.year)) : (existing.includes(thisYear) ? thisYear : existing[0]);
  const keys = editYear ? yearKeys(editYear) : null;
  const editable = keys ? periods.filter((p) => p.year_key === keys.income || p.year_key === keys.monthly) : [];

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Generate periods</CardTitle>
          <CardDescription>
            Creates the five income tax codes for the year of assessment (instalments 1 to 4 and the final payment)
            and the twelve WHT/APIT monthly codes for the calendar year, with the default due dates. Codes are never
            typed. Running it again for the same year adds nothing.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <GeneratePeriods years={candidates} defaultYear={nextMissing?.value ?? thisYear + 1} />
          <p className="text-xs text-muted-foreground">
            Generated so far:{" "}
            {existing.length
              ? existing
                  .slice()
                  .sort((a, b) => a - b)
                  .map((y) => `${yearKeys(y).income} / ${y}`)
                  .join(", ")
              : "none"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Due dates</CardTitle>
          <CardDescription>
            Defaults: instalments on 15 Aug, 15 Nov, 15 Feb and 15 May, the final payment on 30 Sep after the year,
            and WHT/APIT on the 15th of the following month. Change a date if the IRD moves it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {existing.length > 0 && editYear && (
            <UrlSelect
              param="year"
              ariaLabel="Year"
              value={String(editYear)}
              options={existing.map((y) => ({ value: String(y), label: `${yearKeys(y).income} and ${y}` }))}
            />
          )}
          {editable.length === 0 ? (
            <p className="text-sm text-muted-foreground">No periods yet. Generate a year above.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Applies to</TableHead>
                    <TableHead>Due date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editable.map((p) => (
                    <TableRow key={p.id} data-period={p.code}>
                      <TableCell className="font-mono">{p.code}</TableCell>
                      <TableCell>
                        {p.label} <span className="text-muted-foreground">· {p.year_key}</span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{p.family === "income" ? "CIT, IIT, PIT" : "WHT, APIT"}</TableCell>
                      <TableCell>
                        <DueDateEditor periodId={p.id} value={p.due_date} label={`${p.code} ${p.label}`} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff accounts</CardTitle>
          <CardDescription>
            Read only. Staff are invited, and removed, in the Supabase dashboard (Authentication → Users). Everyone
            has the same permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(profilesRes.data ?? []).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDateTime(p.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
