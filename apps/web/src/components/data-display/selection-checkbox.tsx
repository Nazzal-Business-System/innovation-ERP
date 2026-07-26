"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type SelectionCheckboxProps = {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  "aria-label": string;
  onCheckedChange: (checked: boolean) => void;
  className?: string;
};

/**
 * Accessible table selection checkbox with a large hit target.
 * Stops row-level click handlers via data-row-click-ignore + stopPropagation.
 */
export function SelectionCheckbox({
  checked,
  indeterminate = false,
  disabled = false,
  onCheckedChange,
  className,
  ...aria
}: SelectionCheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = Boolean(indeterminate) && !checked;
    }
  }, [indeterminate, checked]);

  return (
    <label
      data-row-click-ignore
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-md",
        disabled
          ? "cursor-not-allowed opacity-40"
          : "cursor-pointer hover:bg-[var(--muted-bg)]/70",
        "focus-within:ring-2 focus-within:ring-[var(--ring)] focus-within:ring-offset-1 focus-within:ring-offset-[var(--background)]",
        className
      )}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <input
        ref={inputRef}
        type="checkbox"
        className={cn(
          "h-4 w-4 accent-[var(--accent)]",
          disabled ? "cursor-not-allowed" : "cursor-pointer"
        )}
        checked={checked}
        disabled={disabled}
        aria-label={aria["aria-label"]}
        onChange={(e) => {
          if (disabled) return;
          onCheckedChange(e.target.checked);
        }}
        onClick={(e) => e.stopPropagation()}
      />
    </label>
  );
}
