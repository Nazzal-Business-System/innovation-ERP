"use client";

import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/data-display/data-table";
import { EntityEmptyState } from "./entity-empty-state";
import { EntityTableSection } from "./entity-table-section";
import { useEntityLayout } from "./context/entity-layout-context";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LineWithProduct = {
  id?: string;
  productId: string;
  sku: string;
  productName?: string;
};

/**
 * Shared transactional line-item presentation:
 * - EntityTableSection scroll container
 * - compact density in Compact/Focus layouts
 * - optional product deep-links without remounting the table shell
 */
export function TransactionalLineTable<T extends { id: string }>({
  title,
  description,
  columns,
  data,
  pageSize = 20,
  totals,
  emptyTitle,
  actions,
  id = "line-items",
}: {
  title: string;
  description?: string;
  columns: ColumnDef<T, unknown>[];
  data: T[];
  pageSize?: number;
  totals?: ReactNode;
  emptyTitle?: string;
  actions?: ReactNode;
  id?: string;
}) {
  const { t } = useI18n();
  const { layout } = useEntityLayout();
  const compact = layout === "compact" || layout === "focus";

  return (
    <EntityTableSection id={id} title={title} description={description} actions={actions}>
      {data.length === 0 ? (
        <div className="p-4">
          <EntityEmptyState
            variant="empty"
            density="compact"
            title={emptyTitle ?? t("common.noData")}
          />
        </div>
      ) : (
        <div className={cn(compact && "ew-table-compact text-sm")}>
          <DataTable columns={columns} data={data} pageSize={pageSize} />
          {totals ? (
            <div className="border-t border-[var(--border-subtle)] bg-[var(--muted-bg)]/30 px-3 py-2 text-sm">
              {totals}
            </div>
          ) : null}
        </div>
      )}
    </EntityTableSection>
  );
}

/** SKU cell with optional product link (permission-gated by caller). */
export function TransactionalSkuCell({
  line,
  canLink,
}: {
  line: LineWithProduct;
  canLink?: boolean;
}) {
  if (!canLink) {
    return <span className="ew-ltr-isolate font-mono text-sm font-semibold">{line.sku}</span>;
  }
  return (
    <Link
      href={`/dashboard/inventory/products/${line.productId}`}
      className="ew-ltr-isolate cursor-pointer font-mono text-sm font-semibold text-[var(--accent)] hover:underline"
    >
      {line.sku}
    </Link>
  );
}
