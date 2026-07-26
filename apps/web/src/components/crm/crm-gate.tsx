"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CRM_PERMISSIONS } from "@ierp/shared";
import { useAuthStore } from "@/lib/auth-store";
import { useNavigation } from "@/lib/navigation-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

const CRM_LINKS = [
  { href: "/dashboard/crm", label: "Overview", match: "exact" as const },
  { href: "/dashboard/crm/leads", label: "Leads", match: "prefix" as const },
  { href: "/dashboard/crm/opportunities", label: "Opportunities", match: "prefix" as const },
  { href: "/dashboard/crm/activities", label: "Activities", match: "prefix" as const },
];

function isCrmLinkActive(href: string, match: "exact" | "prefix", pathname: string): boolean {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function CrmGate({ children }: { children: React.ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized);
  const permissions = useAuthStore((s) => s.permissions);

  if (!initialized) return <PageSkeleton />;

  if (!permissions.includes(CRM_PERMISSIONS.READ)) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Access denied"
          description="You do not have crm.read permission. Try logging in as Sales Manager or CEO."
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

export function CrmNavLinks() {
  const pathname = usePathname();
  const { startNavigation } = useNavigation();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-5"
      aria-label="CRM sections"
    >
      {CRM_LINKS.map((link) => {
        const isActive = isCrmLinkActive(link.href, link.match, pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => {
              if (link.href !== pathname) startNavigation(link.href);
            }}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "ierp-focus-ring cursor-pointer rounded-lg border px-3.5 py-2 text-xs font-medium transition-all duration-200",
              isActive
                ? "border-[var(--sidebar-active-border)] bg-[var(--accent-muted)] text-[var(--foreground)] shadow-sm"
                : "border-[var(--border-subtle)] bg-[var(--muted-bg)]/40 text-[var(--muted)] hover:border-[var(--sidebar-active-border)] hover:bg-[var(--accent-muted)] hover:text-[var(--foreground)]"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
