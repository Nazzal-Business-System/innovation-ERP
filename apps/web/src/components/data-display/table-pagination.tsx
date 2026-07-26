"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type TablePaginationProps = {
  page: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Compact toolbar variant (default) vs sticky mobile footer. */
  variant?: "toolbar" | "footer";
  disabled?: boolean;
  showRange?: boolean;
};

export function getPageItemRange(page: number, pageSize: number, totalItems: number) {
  if (totalItems <= 0 || pageSize <= 0) {
    return { from: 0, to: 0 };
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  return { from, to };
}

/**
 * Compact ERP pagination control for toolbars and table headers.
 * Does not remount tables — parent keeps previous data via React Query keepPrevious.
 */
export function TablePagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
  variant = "toolbar",
  disabled = false,
  showRange = true,
}: TablePaginationProps) {
  const { t } = useI18n();
  const [isPending, startTransition] = useTransition();
  const safeTotalPages = Math.max(1, totalPages || 1);
  const canPrev = page > 1 && !disabled && !isPending;
  const canNext = page < safeTotalPages && !disabled && !isPending;

  const go = useCallback(
    (next: number) => {
      if (next < 1 || next > safeTotalPages || next === page || disabled || isPending) return;
      startTransition(() => onPageChange(next));
    },
    [disabled, isPending, onPageChange, page, safeTotalPages]
  );

  const range =
    showRange && totalItems != null && pageSize != null
      ? getPageItemRange(page, pageSize, totalItems)
      : null;

  return (
    <nav
      aria-label={t("pagination.label")}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] px-1.5 py-1 text-xs shadow-sm",
        variant === "footer" &&
          "w-full justify-between sm:w-auto sm:justify-start sticky bottom-3 z-20 mx-auto shadow-[var(--shadow-md)]",
        className
      )}
    >
      {range && totalItems != null && (
        <span className="hidden px-2 font-medium tabular-nums text-[var(--muted)] sm:inline">
          {t("pagination.range")
            .replace("{from}", String(range.from))
            .replace("{to}", String(range.to))
            .replace("{total}", String(totalItems))}
        </span>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 cursor-pointer"
            disabled={!canPrev}
            aria-label={t("pagination.prev")}
            onClick={() => go(page - 1)}
          >
            <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("pagination.prev")}</TooltipContent>
      </Tooltip>

      <span
        className="min-w-[5.5rem] px-1 text-center font-medium tabular-nums text-[var(--foreground)]"
        aria-live="polite"
      >
        {t("pagination.pageOf")
          .replace("{page}", String(page))
          .replace("{totalPages}", String(safeTotalPages))}
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 cursor-pointer"
            disabled={!canNext}
            aria-label={t("pagination.next")}
            onClick={() => go(page + 1)}
          >
            <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t("pagination.next")}</TooltipContent>
      </Tooltip>
    </nav>
  );
}
