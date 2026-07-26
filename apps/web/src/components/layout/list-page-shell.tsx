"use client";

import type { ReactNode } from "react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageSection } from "@/components/layout/page-section";

interface ListPageShellProps {
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  nav?: ReactNode;
  toolbar?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

export function ListPageShell({
  title,
  description,
  badge,
  actions,
  nav,
  toolbar,
  children,
  footer,
}: ListPageShellProps) {
  return (
    <ModuleLayout>
      <header className="flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
            {badge}
          </div>
          {description && (
            <p className="mt-1.5 max-w-2xl text-sm text-[var(--muted)]">{description}</p>
          )}
        </div>
        {actions}
      </header>

      {nav}

      {toolbar && (
        <PageSection contentClassName="space-y-4">
          {toolbar}
        </PageSection>
      )}

      <div>{children}</div>

      {footer}
    </ModuleLayout>
  );
}
