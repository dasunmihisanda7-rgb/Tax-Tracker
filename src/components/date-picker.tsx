"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { dateToIso, formatDate, isoToDate } from "@/lib/format";

/**
 * Date picker for Postgres `date` values (ISO "YYYY-MM-DD" strings), shown as DD/MM/YYYY.
 * Dates are always picked, never typed, so day and month can't be swapped (PLAN.md section 3).
 */
export function DatePicker({
  value,
  onChange,
  max,
  min,
  placeholder = "Pick a date",
  id,
  disabled,
  className,
  ariaLabel,
  compact = false,
}: {
  /** Compact: the trigger is just the small date text (for grid cells). */
  compact?: boolean;
  value: string | null;
  onChange: (iso: string) => void;
  max?: string;
  min?: string;
  placeholder?: string;
  id?: string;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? isoToDate(value) : undefined;
  const after = max ? isoToDate(max) : undefined;
  const before = min ? isoToDate(min) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {compact ? (
        <PopoverTrigger
          render={
            <button
              id={id}
              type="button"
              disabled={disabled}
              aria-label={ariaLabel}
              className={cn(
                "rounded px-1 text-[11px] text-muted-foreground tabular-nums hover:bg-muted hover:text-foreground disabled:opacity-50",
                className,
              )}
            />
          }
        >
          {value ? formatDate(value) : placeholder}
        </PopoverTrigger>
      ) : (
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              aria-label={ariaLabel}
              className={cn("justify-start font-normal tabular-nums", !value && "text-muted-foreground", className)}
            />
          }
        >
          <CalendarIcon className="size-4" />
          {value ? formatDate(value) : placeholder}
        </PopoverTrigger>
      )}
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected ?? after}
          captionLayout="dropdown"
          startMonth={new Date(2015, 0)}
          endMonth={after ?? new Date(new Date().getFullYear() + 5, 11)}
          disabled={[...(after ? [{ after }] : []), ...(before ? [{ before }] : [])]}
          weekStartsOn={1}
          onSelect={(d) => {
            if (d) {
              onChange(dateToIso(d));
              setOpen(false);
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
