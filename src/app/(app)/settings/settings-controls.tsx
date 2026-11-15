"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/date-picker";
import { SimpleSelect } from "@/components/simple-select";
import { generatePeriods, updateDueDate } from "@/lib/settings/actions";

/** Pick a year and generate its periods. Safe to run twice: existing codes are left alone. */
export function GeneratePeriods({ years, defaultYear }: { years: { value: number; done: boolean }[]; defaultYear: number }) {
  const [year, setYear] = useState(String(defaultYear));
  const [pending, startTransition] = useTransition();
  const run = () =>
    startTransition(async () => {
      const res = await generatePeriods(Number(year));
      if (!res.ok) toast.error(res.error);
      else if (res.added === 0) toast.info(`All periods for ${year} already exist. Nothing was added.`);
      else toast.success(`${res.added} periods added for ${year}.`);
    });
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SimpleSelect
        ariaLabel="Year to generate"
        value={year}
        onChange={setYear}
        options={years.map((y) => ({
          value: String(y.value),
          label: `${y.value}/${String((y.value + 1) % 100).padStart(2, "0")} and ${y.value}${y.done ? " (exists)" : ""}`,
        }))}
      />
      <Button onClick={run} disabled={pending}>
        {pending ? "Generating…" : "Generate periods"}
      </Button>
    </div>
  );
}

/** Editable due date for one period. Saves as soon as a date is picked. */
export function DueDateEditor({ periodId, value, label }: { periodId: string; value: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <DatePicker
      value={value}
      ariaLabel={`Due date for ${label}`}
      disabled={pending}
      className="w-40"
      onChange={(d) => {
        if (d === value) return;
        startTransition(async () => {
          const res = await updateDueDate(periodId, d);
          if (res.ok) toast.success(`${label}: due date changed.`);
          else toast.error(res.error);
        });
      }}
    />
  );
}
