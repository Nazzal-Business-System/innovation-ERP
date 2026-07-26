"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ModuleLayout } from "@/components/layout/module-layout";
import { cn } from "@/lib/utils";

interface ModuleOverviewShellProps {
  hero: {
    title: string;
    description?: string;
    eyebrow?: string;
    badge?: ReactNode;
    actions?: ReactNode;
    icon?: LucideIcon;
  };
  nav?: ReactNode;
  guide?: ReactNode;
  kpis?: ReactNode;
  charts?: ReactNode;
  main?: ReactNode;
  sidebar?: ReactNode;
  quickActions?: ReactNode;
  activity?: ReactNode;
  className?: string;
}

export function ModuleOverviewShell({
  hero,
  nav,
  guide,
  kpis,
  charts,
  main,
  sidebar,
  quickActions,
  activity,
  className,
}: ModuleOverviewShellProps) {
  const Icon = hero.icon;

  return (
    <ModuleLayout className={className}>
      <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--card)] p-5 sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--accent-muted),_transparent_55%)]" aria-hidden />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            {hero.eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--accent)]">
                {hero.eyebrow}
              </p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
              {Icon && (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--background)]">
                  <Icon className="h-5 w-5 text-[var(--accent)]" aria-hidden />
                </div>
              )}
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{hero.title}</h1>
              {hero.badge}
            </div>
            {hero.description && (
              <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{hero.description}</p>
            )}
          </div>
          {hero.actions}
        </div>
      </section>

      {nav}
      {guide}

      {kpis && <section>{kpis}</section>}

      {(charts || main || sidebar) && (
        <div className={cn("grid gap-6", sidebar ? "xl:grid-cols-3" : "")}>
          <div className={cn("space-y-6", sidebar ? "xl:col-span-2" : "")}>
            {charts}
            {main}
          </div>
          {sidebar && <aside className="space-y-6">{sidebar}</aside>}
        </div>
      )}

      {quickActions && <section>{quickActions}</section>}
      {activity && <section>{activity}</section>}
    </ModuleLayout>
  );
}
