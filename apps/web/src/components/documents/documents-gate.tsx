"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DOCUMENTS_PERMISSIONS } from "@ierp/shared";
import { useAuthStore } from "@/lib/auth-store";
import { useNavLabel } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

const DOCUMENTS_LINKS = [
  { href: "/dashboard/documents", id: "documents-overview", match: "overview" as const },
  { href: "/dashboard/documents/files", id: "documents-files", match: "prefix" as const },
  { href: "/dashboard/documents/categories", id: "documents-categories", match: "prefix" as const },
  { href: "/dashboard/documents/expiring", id: "documents-expiring", match: "prefix" as const },
];

function isDocumentsLinkActive(
  href: string,
  match: "overview" | "prefix",
  pathname: string
): boolean {
  if (match === "overview") {
    return (
      pathname === href ||
      (pathname.startsWith("/dashboard/documents/") &&
        !pathname.startsWith("/dashboard/documents/files") &&
        !pathname.startsWith("/dashboard/documents/categories") &&
        !pathname.startsWith("/dashboard/documents/expiring"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DocumentsGate({ children }: { children: React.ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized);
  const permissions = useAuthStore((s) => s.permissions);

  if (!initialized) return <PageSkeleton />;

  if (!permissions.includes(DOCUMENTS_PERMISSIONS.READ)) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Access denied"
          description="You do not have documents.read permission. Try logging in as CEO or HR Manager."
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

function DocumentsNavLink({
  href,
  id,
  match,
  pathname,
  startNavigation,
}: {
  href: string;
  id: string;
  match: "overview" | "prefix";
  pathname: string;
  startNavigation: (href: string) => void;
}) {
  const label = useNavLabel(id);
  const isActive = isDocumentsLinkActive(href, match, pathname);

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

export function DocumentsNavLinks() {
  const pathname = usePathname();
  const { startNavigation } = useNavigation();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-5"
      aria-label="Documents sections"
    >
      {DOCUMENTS_LINKS.map((link) => (
        <DocumentsNavLink
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
