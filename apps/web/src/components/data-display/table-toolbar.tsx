import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface TableToolbarProps {
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Accessible name for the search field (defaults to placeholder). */
  searchAriaLabel?: string;
  actions?: React.ReactNode;
  /**
   * Compact filter controls (selects, toggles) rendered inline with search.
   * Prefer this over a second full-width row — selects should use w-auto + min-width.
   */
  filters?: React.ReactNode;
  /** Compact controls aligned end (pagination, result count, etc.). */
  endAddon?: React.ReactNode;
  className?: string;
}

/**
 * Shared list/filter toolbar used across ERP directories.
 * Keep filter controls in `filters` (not a separate full-width row).
 * Native date inputs must not use w-full here — that caused desktop stacking.
 */
export function TableToolbar({
  title,
  description,
  searchPlaceholder = "Search…",
  searchValue,
  onSearchChange,
  searchAriaLabel,
  actions,
  filters,
  endAddon,
  className,
}: TableToolbarProps) {
  const hasHeaderCopy = Boolean(title || description);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] bg-[var(--card)] p-3 sm:p-4",
        className
      )}
    >
      {hasHeaderCopy ? (
        <div className="min-w-0">
          {title && <h3 className="text-sm font-semibold text-[var(--foreground)]">{title}</h3>}
          {description && <p className="mt-0.5 text-sm text-[var(--muted)]">{description}</p>}
        </div>
      ) : null}

      <div
        className={cn(
          "flex min-w-0 flex-wrap items-end gap-2",
          /* Compact toolbar controls — never let native fields stretch full row width. */
          "[&_select]:w-auto [&_select]:max-w-[14rem] [&_select]:shrink-0",
          "[&_input]:w-auto [&_input]:max-w-full [&_input]:shrink-0",
          "[&_input[type=date]]:w-[10.5rem] [&_input[type=date]]:min-w-[9.5rem]"
        )}
      >
        {onSearchChange !== undefined && (
          <div className="relative min-w-0 flex-[1_1_16rem] basis-[16rem] sm:max-w-[22rem] sm:flex-[1_1_18rem]">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              aria-hidden
            />
            <Input
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              aria-label={searchAriaLabel ?? searchPlaceholder}
              className="w-full max-w-none ps-9"
            />
          </div>
        )}
        {filters}
        {actions}
        {endAddon ? (
          <div className="ms-auto flex shrink-0 flex-wrap items-end gap-2">{endAddon}</div>
        ) : null}
      </div>
    </div>
  );
}

/** Compact labeled control for toolbar filters (Entity, From, Rows, …). */
export function ToolbarField({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label
        htmlFor={htmlFor}
        className="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
