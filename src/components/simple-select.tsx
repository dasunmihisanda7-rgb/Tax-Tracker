"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type Option = { value: string; label: string };

/** A plain single-choice select over a list of options. */
export function SimpleSelect({
  value,
  onChange,
  options,
  placeholder,
  className,
  id,
  invalid,
  ariaLabel,
}: {
  value: string | null;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  id?: string;
  invalid?: boolean;
  ariaLabel?: string;
}) {
  return (
    <Select
      value={value}
      onValueChange={(v) => {
        if (v != null) onChange(String(v));
      }}
      items={options}
    >
      <SelectTrigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        className={cn("min-w-40", className)}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
