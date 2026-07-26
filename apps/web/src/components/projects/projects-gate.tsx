"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PROJECTS_PERMISSIONS } from "@ierp/shared";
import { useAuthStore } from "@/lib/auth-store";
import { useNavLabel } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

const PROJECTS_LINKS = [
  { href: "/dashboard/projects", id: "projects-overview", match: "overview" as const },
  { href: "/dashboard/projects/tasks", id: "projects-tasks", match: "prefix" as const },
  { href: "/dashboard/projects/milestones", id: "projects-milestones", match: "prefix" as const },
];

function isProjectsLinkActive(
  href: string,
  match: "overview" | "prefix",
  pathname: string
): boolean {
  if (match === "overview") {
    return (
      pathname === href ||
      (pathname.startsWith("/dashboard/projects/") &&
        !pathname.startsWith("/dashboard/projects/tasks") &&
        !pathname.startsWith("/dashboard/projects/milestones"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function ProjectsGate({ children }: { children: React.ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized);
  const permissions = useAuthStore((s) => s.permissions);

  if (!initialized) return <PageSkeleton />;

  if (!permissions.includes(PROJECTS_PERMISSIONS.READ)) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Access denied"
          description="You do not have projects.read permission. Try logging in as Project Manager or CEO."
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

function ProjectsNavLink({
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
  const isActive = isProjectsLinkActive(href, match, pathname);

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

export function ProjectsNavLinks() {
  const pathname = usePathname();
  const { startNavigation } = useNavigation();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-5"
      aria-label="Projects sections"
    >
      {PROJECTS_LINKS.map((link) => (
        <ProjectsNavLink
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
