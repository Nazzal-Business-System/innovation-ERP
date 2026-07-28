"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { isEmployeeSelfServiceUser, resolveHomeRoute } from "@/lib/auth-home-route";
import { useAuthStore } from "@/lib/auth-store";
import { useI18n, useNavLabel } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { cn } from "@/lib/utils";

const SELF_LINKS = [
  { href: "/dashboard/my-workspace", id: "my-overview", match: "exact" as const },
  { href: "/dashboard/my-workspace/profile", id: "my-profile", match: "exact" as const },
  { href: "/dashboard/my-workspace/attendance", id: "my-attendance", match: "exact" as const },
  { href: "/dashboard/my-workspace/leave", id: "my-leave", match: "prefix" as const },
  { href: "/dashboard/my-workspace/payroll", id: "my-payroll", match: "exact" as const },
  { href: "/dashboard/my-workspace/contract", id: "my-contract", match: "exact" as const },
  { href: "/dashboard/my-workspace/documents", id: "my-documents", match: "exact" as const },
  { href: "/dashboard/my-workspace/knowledge", id: "my-knowledge", match: "prefix" as const },
  { href: "/dashboard/my-workspace/company-documents", id: "my-company-documents", match: "exact" as const },
  { href: "/dashboard/my-workspace/notifications", id: "my-notifications", match: "exact" as const },
];

function isSelfLinkActive(href: string, match: "exact" | "prefix", pathname: string): boolean {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Blocks non–self-service users from the employee workspace (managers/CEO → access denied). */
export function MyWorkspaceGate({ children }: { children: React.ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized);
  const permissions = useAuthStore((s) => s.permissions);
  const { t } = useI18n();

  if (!initialized) return <PageSkeleton />;

  if (!isEmployeeSelfServiceUser(permissions)) {
    return (
      <div className="space-y-4">
        <ErrorState
          title={t("selfService.accessDenied", "Access denied")}
          description={t(
            "selfService.accessDeniedDesc",
            "This area is for employee self-service accounts."
          )}
        />
        <div className="flex justify-center">
          <Button asChild variant="secondary" size="sm">
            <Link href={resolveHomeRoute(permissions)}>
              {t("selfService.backHome", "Back to home")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * For regular employees (hr_self without full hr.read):
 * - keep them inside my-workspace / profile / notifications / appearance settings
 * - bounce management URLs back to the self-service home
 */
export function EmployeeSelfServiceRedirect({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const permissions = useAuthStore((s) => s.permissions);
  const authReady = useAuthStore((s) => s.authReady);

  useEffect(() => {
    if (!authReady || !pathname) return;
    if (!isEmployeeSelfServiceUser(permissions)) return;

    const allowed =
      pathname.startsWith("/dashboard/my-workspace") ||
      pathname === "/dashboard/profile" ||
      pathname.startsWith("/dashboard/notifications") ||
      pathname.startsWith("/dashboard/settings/appearance") ||
      pathname.startsWith("/dashboard/settings/language");

    if (!allowed) {
      router.replace("/dashboard/my-workspace");
    }
  }, [authReady, pathname, permissions, router]);

  return <>{children}</>;
}

/** Optional in-page nav — prefer the sidebar; kept for reuse if needed. */
export function MyWorkspaceNavLinks() {
  const pathname = usePathname();
  const { startNavigation } = useNavigation();

  return (
    <nav className="flex flex-wrap gap-2" aria-label="My workspace">
      {SELF_LINKS.map((link) => (
        <SelfNavLink
          key={link.id}
          href={link.href}
          id={link.id}
          match={link.match}
          pathname={pathname}
          startNavigation={startNavigation}
        />
      ))}
    </nav>
  );
}

function SelfNavLink({
  href,
  id,
  match,
  pathname,
  startNavigation,
}: {
  href: string;
  id: string;
  match: "exact" | "prefix";
  pathname: string;
  startNavigation: (href: string) => void;
}) {
  const label = useNavLabel(id);
  const isActive = isSelfLinkActive(href, match, pathname);

  return (
    <Link
      href={href}
      onClick={() => {
        if (href !== pathname) startNavigation(href);
      }}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "ierp-focus-ring cursor-pointer rounded-lg border px-3.5 py-2 text-xs font-medium transition-all duration-200",
        isActive
          ? "border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)]"
          : "border-[var(--border-subtle)] text-[var(--muted)] hover:border-[var(--border)] hover:text-[var(--foreground)]"
      )}
    >
      {label}
    </Link>
  );
}
