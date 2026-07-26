import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface TableToolbarProps {
  title?: string;
  description?: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
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

export function TableToolbar({
  title,
  description,
  searchPlaceholder = "Search…",
  searchValue,
  onSearchChange,
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
          "flex min-w-0 flex-wrap items-center gap-2",
          /* Native selects inherit w-full from form-utils; keep toolbar filters compact. */
          "[&_select]:w-auto [&_select]:max-w-[14rem] [&_select]:shrink-0"
        )}
      >
        {onSearchChange !== undefined && (
          <div className="relative min-w-[12rem] flex-1 basis-[14rem] sm:min-w-[16rem] sm:max-w-sm">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              aria-hidden
            />
            <Input
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full ps-9"
            />
          </div>
        )}
        {filters}
        {actions}
        {endAddon ? (
          <div className="ms-auto flex shrink-0 flex-wrap items-center gap-2">{endAddon}</div>
        ) : null}
      </div>
    </div>
  );
}
