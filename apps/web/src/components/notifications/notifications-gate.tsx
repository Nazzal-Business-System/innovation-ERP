"use client";

import Link from "next/link";
import { NOTIFICATIONS_PERMISSIONS } from "@ierp/shared";
import { useAuthStore } from "@/lib/auth-store";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/feedback/error-state";
import { PageSkeleton } from "@/components/feedback/page-skeleton";

export function NotificationsGate({ children }: { children: React.ReactNode }) {
  const initialized = useAuthStore((s) => s.initialized);
  const permissions = useAuthStore((s) => s.permissions);
  const { t } = useI18n();

  if (!initialized) return <PageSkeleton />;

  if (!permissions.includes(NOTIFICATIONS_PERMISSIONS.READ)) {
    return (
      <div className="space-y-4">
        <ErrorState title={t("common.accessDenied")} description={t("notifications.accessDeniedDesc")} />
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
