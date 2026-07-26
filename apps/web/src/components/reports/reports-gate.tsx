"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { REPORTS_PERMISSIONS } from "@ierp/shared";
import { useAuthStore } from "@/lib/auth-store";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n, useNavLabel } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { ModuleLayout } from "@/components/layout/module-layout";

const REPORTS_LINKS = [
  { href: "/dashboard/reports", id: "reports-overview", match: "exact" as const },
  { href: "/dashboard/reports/sales-summary", id: "reports-sales", match: "exact" as const },
  {
    href: "/dashboard/reports/inventory-valuation",
    id: "reports-inventory",
    match: "exact" as const,
  },
  {
    href: "/dashboard/reports/procurement-summary",
    id: "reports-procurement",
    match: "exact" as const,
  },
  {
    href: "/dashboard/reports/financial-summary",
    id: "reports-financial",
    match: "exact" as const,
  },
  { href: "/dashboard/reports/projects-summary", id: "reports-projects", match: "exact" as const },
  { href: "/dashboard/reports/support-summary", id: "reports-support", match: "exact" as const },
  {
    href: "/dashboard/reports/documents-summary",
    id: "reports-documents",
    match: "exact" as const,
  },
  {
    href: "/dashboard/reports/knowledge-summary",
    id: "reports-knowledge",
    match: "exact" as const,
  },
] as const;

function isReportsLinkActive(href: string, match: "exact" | "prefix", pathname: string): boolean {
  if (href === "/dashboard/reports") {
    return pathname === href || pathname.startsWith(`${href}?`);
  }
  if (match === "exact") return pathname === href || pathname.startsWith(`${href}/`);
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Exactly one tab active: longest matching report href (deep routes → owning report). */
function activeReportsHref(pathname: string): string {
  if (pathname === "/dashboard/reports" || pathname.startsWith("/dashboard/reports?")) {
    return "/dashboard/reports";
  }
  let best: string | null = null;
  for (const link of REPORTS_LINKS) {
    if (link.href === "/dashboard/reports") continue;
    if (pathname === link.href || pathname.startsWith(`${link.href}/`)) {
      if (!best || link.href.length > best.length) best = link.href;
    }
  }
  return best ?? "/dashboard/reports";
}

export function ReportsGate({ children }: { children: React.ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized);
  const permissions = useAuthStore((s) => s.permissions);
  const { t } = useI18n();

  if (!initialized) return <PageSkeleton />;

  if (!permissions.includes(REPORTS_PERMISSIONS.READ)) {
    return (
      <div className="space-y-4">
        <ErrorState
          title={t("common.accessDenied", "Access denied")}
          description="You do not have reports.read permission. Try logging in as CEO, Finance Manager, or Branch Manager."
        />
        <div className="flex justify-center">
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard">{t("common.backToDashboard", "Back to dashboard")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <ReportsModuleShell>{children}</ReportsModuleShell>;
}

/**
 * Same layout primitive as CRM / Finance / HR / Inventory:
 * one `.ierp-page-stack` — section siblings get `var(--space-section)`.
 * Module tabs belong in each page after PageHeader (not above the topbar pad).
 */
export function ReportsModuleShell({ children }: { children: React.ReactNode }) {
  return <ModuleLayout>{children}</ModuleLayout>;
}

function ReportsNavLink({
  href,
  id,
  pathname,
  activeHref,
  startNavigation,
}: {
  href: string;
  id: string;
  pathname: string;
  activeHref: string;
  startNavigation: (href: string) => void;
}) {
  const label = useNavLabel(id);
  const isActive = href === activeHref;

  return (
    <Link
      href={href}
      onClick={() => {
        if (href !== pathname) startNavigation(href);
      }}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "ierp-focus-ring shrink-0 cursor-pointer rounded-lg border px-3.5 py-2 text-xs font-medium transition-all duration-200",
        isActive
          ? "border-[var(--sidebar-active-border)] bg-[var(--accent-muted)] text-[var(--foreground)] shadow-sm"
          : "border-[var(--border-subtle)] bg-[var(--muted-bg)]/40 text-[var(--muted)] hover:border-[var(--sidebar-active-border)] hover:bg-[var(--accent-muted)] hover:text-[var(--foreground)]"
      )}
    >
      {label}
    </Link>
  );
}

/** Module section tabs — same surface as CRM / Finance / HR (`pb-5` border row). */
export function ReportsNavLinks() {
  const pathname = usePathname();
  const { startNavigation } = useNavigation();
  const { t, dir } = useI18n();
  const activeHref = activeReportsHref(pathname);

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-5"
      aria-label={t("nav.group.reports", "Reports")}
      dir={dir}
    >
      {REPORTS_LINKS.map((link) => (
        <ReportsNavLink
          key={link.href}
          href={link.href}
          id={link.id}
          pathname={pathname}
          activeHref={activeHref}
          startNavigation={startNavigation}
        />
      ))}
    </nav>
  );
}

/** @internal */
export { isReportsLinkActive };
