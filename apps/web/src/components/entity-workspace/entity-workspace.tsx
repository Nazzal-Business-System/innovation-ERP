"use client";

import type { ReactNode } from "react";
import { EntityEmptyState } from "./entity-empty-state";
import { EntityLayoutProvider, useEntityLayout } from "./context/entity-layout-context";
import type { DetailsPageLayout } from "@/lib/i18n/types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

function WorkspaceShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { layout } = useEntityLayout();
  return (
    <div
      className={cn("ew-root", className)}
      data-entity-workspace=""
      data-layout={layout}
      data-details-layout={layout}
    >
      {children}
    </div>
  );
}

export function EntityWorkspace({
  entityType,
  entityId,
  layout,
  loading,
  error,
  onRetry,
  readOnly,
  className,
  children,
}: {
  entityType: string;
  entityId: string;
  layout?: DetailsPageLayout;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  readOnly?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <EntityLayoutProvider layout={layout}>
      <WorkspaceShell className={className}>
        <div className="sr-only" aria-live="polite">
          {entityType} {entityId}
          {readOnly ? ` — ${t("common.readOnly")}` : null}
        </div>
        {loading ? (
          <div className="space-y-4" role="status" aria-label={t("common.loading")}>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <Skeleton className="h-48 w-full" />
          </div>
        ) : error ? (
          <EntityEmptyState
            variant="error"
            title={t("entityWorkspace.errorTitle")}
            description={error}
            actionLabel={onRetry ? t("common.retry") : undefined}
            onAction={onRetry}
          />
        ) : (
          children
        )}
      </WorkspaceShell>
    </EntityLayoutProvider>
  );
}

export function EntityWorkspaceBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("ew-body", className)}>{children}</div>;
}

export function EntityWorkspaceMain({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <main className={cn("ew-main", className)} id="entity-workspace-main">
      {children}
    </main>
  );
}
