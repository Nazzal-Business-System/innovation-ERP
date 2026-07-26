"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { KNOWLEDGE_PERMISSIONS } from "@ierp/shared";
import { useAuthStore } from "@/lib/auth-store";
import { useNavLabel } from "@/lib/i18n";
import { isNavItemActive } from "@/lib/nav-active";
import { useNavigation } from "@/lib/navigation-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

const KNOWLEDGE_LINKS = [
  { href: "/dashboard/knowledge", id: "knowledge-overview" },
  { href: "/dashboard/knowledge/articles", id: "knowledge-articles" },
  { href: "/dashboard/knowledge/categories", id: "knowledge-categories" },
  { href: "/dashboard/knowledge/tags", id: "knowledge-tags" },
];

export function KnowledgeGate({ children }: { children: React.ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized);
  const permissions = useAuthStore((s) => s.permissions);

  if (!initialized) return <PageSkeleton />;

  if (!permissions.includes(KNOWLEDGE_PERMISSIONS.READ)) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Access denied"
          description="You do not have knowledge.read permission. Try logging in as CEO."
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

export function KnowledgeNavLinks() {
  const pathname = usePathname();
  const { startNavigation } = useNavigation();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-5"
      aria-label="Knowledge sections"
    >
      {KNOWLEDGE_LINKS.map((link) => (
        <KnowledgeNavLink
          key={link.href}
          href={link.href}
          id={link.id}
          pathname={pathname}
          startNavigation={startNavigation}
        />
      ))}
    </nav>
  );
}

function KnowledgeNavLink({
  href,
  id,
  pathname,
  startNavigation,
}: {
  href: string;
  id: string;
  pathname: string;
  startNavigation: (href: string) => void;
}) {
  const label = useNavLabel(id);
  const isActive = isNavItemActive(href, pathname);

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
