"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AUDIT_PERMISSIONS,
  ROLES_PERMISSIONS,
  SETTINGS_PERMISSIONS,
  USERS_PERMISSIONS,
} from "@ierp/shared";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Bell,
  Globe,
  Languages,
  Palette,
  ScrollText,
  Settings2,
  Shield,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

const SETTINGS_LINKS: Array<{
  href: string;
  labelKey: string;
  icon: LucideIcon;
  match: "exact" | "prefix";
  permission?: string;
}> = [
  { href: "/dashboard/settings", labelKey: "settings.nav.overview", icon: Settings2, match: "exact" },
  { href: "/dashboard/settings/organization", labelKey: "settings.nav.organization", icon: Building2, match: "exact" },
  { href: "/dashboard/settings/branches", labelKey: "settings.nav.branches", icon: Globe, match: "exact" },
  { href: "/dashboard/settings/users", labelKey: "settings.nav.users", icon: Users, match: "exact", permission: USERS_PERMISSIONS.READ },
  { href: "/dashboard/settings/roles", labelKey: "settings.nav.roles", icon: Shield, match: "exact", permission: ROLES_PERMISSIONS.READ },
  { href: "/dashboard/settings/preferences", labelKey: "settings.nav.preferences", icon: SlidersHorizontal, match: "exact" },
  { href: "/dashboard/settings/notifications", labelKey: "settings.nav.notifications", icon: Bell, match: "exact" },
  { href: "/dashboard/settings/audit-logs", labelKey: "settings.nav.auditLogs", icon: ScrollText, match: "exact", permission: AUDIT_PERMISSIONS.READ },
  { href: "/dashboard/settings/appearance", labelKey: "settings.nav.appearance", icon: Palette, match: "exact" },
  { href: "/dashboard/settings/language", labelKey: "settings.nav.language", icon: Languages, match: "exact" },
];

function isSettingsLinkActive(href: string, match: "exact" | "prefix", pathname: string): boolean {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SettingsGate({ children }: { children: React.ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized);
  const permissions = useAuthStore((s) => s.permissions);
  const { t } = useI18n();

  if (!initialized) return <PageSkeleton />;

  if (!permissions.includes(SETTINGS_PERMISSIONS.READ)) {
    return (
      <div className="space-y-4">
        <ErrorState title={t("common.accessDenied")} description={t("settings.accessDeniedDesc")} />
        <div className="flex justify-center">
          <Button asChild variant="secondary" size="sm" className="cursor-pointer">
            <Link href="/dashboard">{t("common.backToDashboard")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export function SettingsPermissionGate({
  permission,
  children,
  title,
  description,
}: {
  permission: string;
  children: React.ReactNode;
  title?: string;
  description?: string;
}) {
  const permissions = useAuthStore((s) => s.permissions);
  const { t } = useI18n();

  if (!permissions.includes(permission)) {
    return (
      <ErrorState
        title={title ?? t("common.accessDenied")}
        description={description ?? t("settings.accessDeniedDesc")}
      />
    );
  }

  return <>{children}</>;
}

export function SettingsNavLinks() {
  const pathname = usePathname();
  const permissions = useAuthStore((s) => s.permissions);
  const { startNavigation } = useNavigation();
  const { t } = useI18n();

  return (
    <nav
      className="flex flex-wrap gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--muted-bg)]/30 p-2"
      aria-label="Settings sections"
    >
      {SETTINGS_LINKS.filter((link) => !link.permission || permissions.includes(link.permission)).map((link) => {
        const isActive = isSettingsLinkActive(link.href, link.match, pathname);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => {
              if (link.href !== pathname) startNavigation(link.href);
            }}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "ierp-focus-ring flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200",
              isActive
                ? "border-[var(--sidebar-active-border)] bg-[var(--accent-muted)] text-[var(--foreground)] shadow-sm"
                : "border-transparent bg-transparent text-[var(--muted)] hover:border-[var(--border-subtle)] hover:bg-[var(--background)] hover:text-[var(--foreground)]"
            )}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {t(link.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
