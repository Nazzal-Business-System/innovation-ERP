"use client";

import { Building2, ClipboardList, Globe, Languages, Palette, Shield, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/data-display/data-table";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MetricGrid } from "@/components/dashboard/metric-grid";
import { ModuleLayout } from "@/components/layout/module-layout";
import { SettingsNavLinks } from "@/components/settings/settings-gate";
import { useAuditLogColumns } from "@/components/settings/settings-columns";
import { StatusBadge } from "@/components/data-display/status-badge";
import { useI18n } from "@/lib/i18n";
import type { SettingsOverview } from "@ierp/shared";

const QUICK_LINKS = [
  { href: "/dashboard/settings/organization", labelKey: "settings.nav.organization", icon: Building2, descKey: "settings.org.description" },
  { href: "/dashboard/settings/appearance", labelKey: "settings.nav.appearance", icon: Palette, descKey: "appearance.description" },
  { href: "/dashboard/settings/language", labelKey: "settings.nav.language", icon: Languages, descKey: "language.description" },
  { href: "/dashboard/settings/users", labelKey: "settings.nav.users", icon: Users, descKey: "settings.users.description" },
  { href: "/dashboard/settings/roles", labelKey: "settings.nav.roles", icon: Shield, descKey: "settings.roles.description" },
  { href: "/dashboard/settings/preferences", labelKey: "settings.nav.preferences", icon: ClipboardList, descKey: "settings.preferences.description" },
] as const;

export function SettingsOverviewView({ overview }: { overview: SettingsOverview }) {
  const { t } = useI18n();
  const auditLogColumns = useAuditLogColumns();

  return (
    <ModuleLayout>
      <section className="relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-gradient-to-br from-[var(--card)] to-[var(--muted-bg)]/40 p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
              {t("settings.controlCenter")}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{t("settings.title")}</h1>
            <p className="mt-2 max-w-xl text-sm text-[var(--muted)]">{t("settings.description")}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <StatusBadge
                status={overview.organization.isActive ? "active" : "inactive"}
                label={overview.organization.isActive ? t("common.active") : t("common.inactive")}
              />
              <Badge variant="secondary">{overview.organization.name}</Badge>
            </div>
          </div>
          <Card className="w-full max-w-sm border-[var(--border-subtle)] bg-[var(--background)]/80">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t("settings.systemHealth")}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-[var(--border-subtle)] px-3 py-2">
                <p className="text-[10px] text-[var(--muted)]">{t("settings.nav.branches")}</p>
                <p className="font-semibold tabular-nums">{overview.branchCount}</p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] px-3 py-2">
                <p className="text-[10px] text-[var(--muted)]">{t("settings.nav.users")}</p>
                <p className="font-semibold tabular-nums">{overview.userCount}</p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] px-3 py-2">
                <p className="text-[10px] text-[var(--muted)]">{t("settings.nav.roles")}</p>
                <p className="font-semibold tabular-nums">{overview.roleCount}</p>
              </div>
              <div className="rounded-lg border border-[var(--border-subtle)] px-3 py-2">
                <p className="text-[10px] text-[var(--muted)]">{t("settings.nav.preferences")}</p>
                <p className="font-semibold tabular-nums">{overview.preferenceCount}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <SettingsNavLinks />

      <MetricGrid columns={4}>
        <KpiCard title={t("settings.nav.branches")} value={String(overview.branchCount)} icon={Globe} />
        <KpiCard title={t("settings.nav.users")} value={String(overview.userCount)} icon={Users} />
        <KpiCard title={t("settings.nav.roles")} value={String(overview.roleCount)} icon={Shield} />
        <KpiCard title={t("settings.nav.preferences")} value={String(overview.preferenceCount)} icon={ClipboardList} />
      </MetricGrid>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_LINKS.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="group flex cursor-pointer flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-5 transition-all hover:border-[var(--sidebar-active-border)] hover:shadow-[var(--shadow-md)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent-muted)]">
                <Icon className="h-5 w-5 text-[var(--accent)]" aria-hidden />
              </div>
              <p className="mt-4 text-sm font-semibold">{t(link.labelKey)}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{t(link.descKey)}</p>
            </Link>
          );
        })}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold">{t("settings.recentAudit")}</h2>
            <p className="text-sm text-[var(--muted)]">{t("settings.recentAuditDesc")}</p>
          </div>
          <Link href="/dashboard/settings/audit-logs" className="text-sm font-medium text-[var(--accent)] hover:underline">
            {t("common.viewAll")} →
          </Link>
        </div>
        <DataTable columns={auditLogColumns} data={overview.recentAuditLogs} pageSize={8} />
      </section>
    </ModuleLayout>
  );
}
