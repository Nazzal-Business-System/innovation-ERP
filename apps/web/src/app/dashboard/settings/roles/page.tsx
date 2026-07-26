"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type { SettingsRole } from "@ierp/shared";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsNavLinks, SettingsPermissionGate } from "@/components/settings/settings-gate";
import { SettingsTableSkeleton } from "@/components/settings/settings-page-skeleton";
import { RolesPermissionsEditor } from "@/components/settings/roles-permissions-editor";
import { useSettingsPermissions, useSettingsRoles } from "@/lib/hooks/use-settings";
import { useI18n } from "@/lib/i18n";
import { queryKeys } from "@/lib/query/client";
import { ROLES_PERMISSIONS } from "@ierp/shared";

export default function RolesPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const { data: rolesData, loading: rolesLoading, error: rolesError, refetch: refetchRoles } = useSettingsRoles();
  const { data: permissionsData, loading: permsLoading } = useSettingsPermissions();
  const [roles, setRoles] = useState<SettingsRole[] | null>(null);

  const displayRoles = roles ?? rolesData?.data ?? [];

  if ((rolesLoading && !rolesData) || (permsLoading && !permissionsData)) {
    return (
      <ModuleLayout>
        <SettingsTableSkeleton />
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("settings.roles.title")}
          description={t("settings.roles.description")}
          badge={
            displayRoles.length > 0 ? (
              <Badge variant="secondary">
                {displayRoles.length} {t("settings.rbacRoles").toLowerCase()}
              </Badge>
            ) : undefined
          }
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <SettingsNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <SettingsPermissionGate permission={ROLES_PERMISSIONS.READ}>
          {rolesError ? (
            <ErrorState
              title={t("error.loadRoles")}
              description={rolesError}
              onRetry={() => void refetchRoles()}
            />
          ) : permissionsData && displayRoles.length > 0 ? (
            <RolesPermissionsEditor
              roles={displayRoles}
              permissions={permissionsData.data}
              onRolesUpdated={(next) => {
                setRoles(next);
                queryClient.setQueryData(queryKeys.settings.roles, { data: next });
              }}
            />
          ) : (
            <ErrorState title={t("error.loadRoles")} description={t("common.noData")} />
          )}
        </SettingsPermissionGate>
      </FadeIn>
    </ModuleLayout>
  );
}
