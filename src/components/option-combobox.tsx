"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import type { Option } from "@/components/simple-select";
import { cn } from "@/lib/utils";

/** Searchable single-choice picker over a list of options (e.g. clients). */
export function OptionCombobox({
  value,
  onChange,
  options,
  placeholder = "Search…",
  emptyText = "No matches.",
  id,
  invalid,
  ariaLabel,
  className,
  showClear = false,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
  options: Option[];
  placeholder?: string;
  emptyText?: string;
  id?: string;
  invalid?: boolean;
  ariaLabel?: string;
  className?: string;
  showClear?: boolean;
}) {
  const selected = options.find((o) => o.value === value) ?? null;
  return (
    <Combobox<Option>
      items={options}
      value={selected}
      onValueChange={(o) => onChange(o ? o.value : null)}
      itemToStringLabel={(o) => o.label}
      isItemEqualToValue={(a, b) => a.value === b.value}
    >
      <ComboboxInput
        id={id}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        showClear={showClear}
        className={cn("w-full", className)}
      />
      <ComboboxContent>
        <ComboboxEmpty>{emptyText}</ComboboxEmpty>
        <ComboboxList>
          {(o: Option) => (
            <ComboboxItem key={o.value} value={o}>
              {o.label}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
