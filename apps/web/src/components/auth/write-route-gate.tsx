"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { ErrorState } from "@/components/feedback/error-state";
import { PageSkeleton } from "@/components/feedback/page-skeleton";
import { Button } from "@/components/ui/button";

/** Prevent read-only users from opening create routes while API RBAC remains authoritative. */
export function WriteRouteGate({
  children,
  anyOf,
  backHref,
}: {
  children: React.ReactNode;
  anyOf: readonly string[];
  backHref: string;
}) {
  const pathname = usePathname();
  const initialized = useAuthStore((state) => state.initialized);
  const permissions = useAuthStore((state) => state.permissions);

  if (!pathname.endsWith("/new")) return <>{children}</>;
  if (!initialized) return <PageSkeleton />;
  if (anyOf.some((permission) => permissions.includes(permission))) return <>{children}</>;

  return (
    <div className="space-y-4">
      <ErrorState
        title="Access denied"
        description="You have view access, but do not have permission to create records in this module."
      />
      <div className="flex justify-center">
        <Button asChild variant="secondary" size="sm">
          <Link href={backHref}>Back to list</Link>
        </Button>
      </div>
    </div>
  );
}
