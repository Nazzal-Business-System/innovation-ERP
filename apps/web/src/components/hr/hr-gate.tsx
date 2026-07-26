"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HR_PERMISSIONS } from "@ierp/shared";
import { useAuthStore } from "@/lib/auth-store";
import { useNavLabel } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

const HR_LINKS = [
  { href: "/dashboard/hr", id: "hr-overview", match: "exact" as const },
  { href: "/dashboard/hr/employees", id: "hr-employees", match: "prefix" as const },
  { href: "/dashboard/hr/departments", id: "hr-departments", match: "exact" as const },
  { href: "/dashboard/hr/attendance", id: "hr-attendance", match: "exact" as const },
  { href: "/dashboard/hr/leave-requests", id: "hr-leave", match: "prefix" as const },
  { href: "/dashboard/hr/payroll", id: "hr-payroll", match: "prefix" as const },
  { href: "/dashboard/hr/contracts", id: "hr-contracts", match: "prefix" as const },
  { href: "/dashboard/hr/documents", id: "hr-documents", match: "prefix" as const },
  { href: "/dashboard/hr/positions", id: "hr-positions", match: "prefix" as const },
];

function isHrLinkActive(href: string, match: "exact" | "prefix", pathname: string): boolean {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function HrGate({ children }: { children: React.ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized);
  const permissions = useAuthStore((s) => s.permissions);

  if (!initialized) return <PageSkeleton />;

  if (!permissions.includes(HR_PERMISSIONS.READ)) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Access denied"
          description="You do not have hr.read permission. Try logging in as HR Manager or CEO."
        />
        <div className="flex justify-center">
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function HrNavLink({
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
  const isActive = isHrLinkActive(href, match, pathname);

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
          ? "border-[var(--sidebar-active-border)] bg-[var(--accent-muted)] text-[var(--foreground)] shadow-sm"
          : "border-[var(--border-subtle)] bg-[var(--muted-bg)]/40 text-[var(--muted)] hover:border-[var(--sidebar-active-border)] hover:bg-[var(--accent-muted)] hover:text-[var(--foreground)]"
      )}
    >
      {label}
    </Link>
  );
}

export function HrNavLinks() {
  const pathname = usePathname();
  const { startNavigation } = useNavigation();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-5"
      aria-label="HR sections"
    >
      {HR_LINKS.map((link) => (
        <HrNavLink
          key={link.href}
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
