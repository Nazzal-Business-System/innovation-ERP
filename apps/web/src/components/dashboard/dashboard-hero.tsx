"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface DashboardHeroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  icon?: LucideIcon;
  stats?: Array<{ label: string; value: string }>;
  className?: string;
}

export function DashboardHero({
  eyebrow,
  title,
  description,
  badge,
  actions,
  icon: Icon,
  stats,
  className,
}: DashboardHeroProps) {
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-[var(--muted-bg)]/60 p-6 shadow-[var(--shadow-sm)] sm:p-8",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-[var(--accent-muted)] blur-3xl"
        aria-hidden
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          {eyebrow && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              {eyebrow}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {Icon && (
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--background)]/80">
                <Icon className="h-5 w-5 text-[var(--accent)]" aria-hidden />
              </div>
            )}
            <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--muted)] sm:text-base">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {stats && stats.length > 0 && (
        <div className="relative mt-6 grid grid-cols-2 gap-3 border-t border-[var(--border-subtle)] pt-5 sm:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background)]/50 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                {stat.label}
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-[var(--foreground)]">{stat.value}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
