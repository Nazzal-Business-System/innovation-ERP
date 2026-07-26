"use client";

import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/data-display/data-table";
import {
  ToolbarPagination,
  toServerPagination,
} from "@/components/data-display/server-pagination";
import { TableToolbar } from "@/components/data-display/table-toolbar";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsNavLinks, SettingsPermissionGate } from "@/components/settings/settings-gate";
import { useUserColumns } from "@/components/settings/settings-columns";
import { SettingsTableSkeleton } from "@/components/settings/settings-page-skeleton";
import { useSettingsUsers } from "@/lib/hooks/use-settings";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useI18n } from "@/lib/i18n";
import { USERS_PERMISSIONS } from "@ierp/shared";

export default function UsersPage() {
  const { t } = useI18n();
  const userColumns = useUserColumns();
  const { page, onPageChange } = useServerPagination([]);
  const { data, loading, error, refetch } = useSettingsUsers({ page });

  if (loading && !data) {
    return (
      <ModuleLayout>
        <SettingsTableSkeleton />
      </ModuleLayout>
    );
  }

  const serverPagination = toServerPagination(data?.pagination, onPageChange, loading);

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("settings.users.title")}
          description={t("settings.users.description")}
          badge={data ? <Badge variant="secondary">{data.pagination.total}</Badge> : undefined}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <SettingsNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <SettingsPermissionGate permission={USERS_PERMISSIONS.READ}>
          {error ? (
            <ErrorState title={t("error.loadUsers")} description={error} onRetry={() => void refetch()} />
          ) : (
            <div className="space-y-5">
              <TableToolbar
                title="User directory"
                description="All accounts in this organization."
                endAddon={
                  <ToolbarPagination
                    pagination={data?.pagination}
                    onPageChange={onPageChange}
                    disabled={loading}
                  />
                }
              />
              <DataTable
                columns={userColumns}
                data={data?.data ?? []}
                emptyTitle="No users found"
                emptyDescription="No user accounts in this organization."
                serverPagination={serverPagination}
                paginationPosition="mobile-only"
              />
            </div>
          )}
        </SettingsPermissionGate>
      </FadeIn>
    </ModuleLayout>
  );
}
