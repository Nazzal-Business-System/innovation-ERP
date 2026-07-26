"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { INVENTORY_PERMISSIONS } from "@ierp/shared";
import { useAuthStore } from "@/lib/auth-store";
import { useNavigation } from "@/lib/navigation-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

const INVENTORY_LINKS = [
  { href: "/dashboard/inventory", label: "Overview", match: "exact" as const },
  { href: "/dashboard/inventory/products", label: "Products", match: "prefix" as const },
  { href: "/dashboard/inventory/warehouses", label: "Warehouses", match: "exact" as const },
  { href: "/dashboard/inventory/movements", label: "Movements", match: "exact" as const },
  { href: "/dashboard/inventory/reservations", label: "Reservations", match: "prefix" as const },
  { href: "/dashboard/inventory/transfers", label: "Transfers", match: "prefix" as const },
];

function isInventoryLinkActive(
  href: string,
  match: "exact" | "prefix",
  pathname: string
): boolean {
  if (match === "exact") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function InventoryGate({ children }: { children: React.ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized);
  const permissions = useAuthStore((s) => s.permissions);

  if (!initialized) {
    return <PageSkeleton />;
  }

  if (!permissions.includes(INVENTORY_PERMISSIONS.READ)) {
    return (
      <div className="space-y-4">
        <ErrorState
          title="Access denied"
          description="You do not have inventory.read permission. Try logging in as Inventory Manager or CEO."
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

export function InventoryNavLinks() {
  const pathname = usePathname();
  const { startNavigation } = useNavigation();

  return (
    <nav
      className="flex flex-wrap gap-2 border-b border-[var(--border-subtle)] pb-5"
      aria-label="Inventory sections"
    >
      {INVENTORY_LINKS.map((link) => {
        const isActive = isInventoryLinkActive(link.href, link.match, pathname);
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
