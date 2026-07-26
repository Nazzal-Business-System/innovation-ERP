"use client";

import { useAuthStore } from "@/lib/auth-store";
import { useExecutiveDashboard } from "@/lib/hooks/use-executive-dashboard";
import { ExecutiveDashboardSkeleton } from "@/components/dashboard/executive-dashboard-skeleton";
import { ExecutiveDashboardView } from "@/components/dashboard/executive-dashboard-view";
import { ErrorState } from "@/components/feedback/error-state";
import { ModuleLayout } from "@/components/layout/module-layout";

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const organization = useAuthStore((s) => s.organization);
  const { data, loading, error, refetch } = useExecutiveDashboard();

  if (loading && !data) {
    return (
      <ModuleLayout>
        <ExecutiveDashboardSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !data) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title="Unable to load executive dashboard"
          description={error ?? "No dashboard data returned from the server."}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  return (
    <ExecutiveDashboardView
      data={data}
      userName={user?.name}
      organizationName={organization?.name}
    />
  );
}
