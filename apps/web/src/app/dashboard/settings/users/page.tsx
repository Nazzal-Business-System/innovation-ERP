"use client";

import { useEffect, useState } from "react";
import { selectClassName } from "@/lib/form-utils";
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
import { useSettingsRoles, useSettingsUsers } from "@/lib/hooks/use-settings";
import { useServerPagination } from "@/lib/hooks/use-server-pagination";
import { useI18n } from "@/lib/i18n";
import { USERS_PERMISSIONS } from "@ierp/shared";
import { cn } from "@/lib/utils";

const PAGE_SIZES = [10, 20, 50, 100] as const;

export default function UsersPage() {
  const { t } = useI18n();
  const userColumns = useUserColumns();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [presence, setPresence] = useState<"all" | "online" | "away" | "offline">("all");
  const [sortBy, setSortBy] = useState<"name" | "email" | "createdAt" | "lastLoginAt">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { page, onPageChange } = useServerPagination([
    debouncedSearch,
    role,
    status,
    presence,
    sortBy,
    sortOrder,
    pageSize,
  ]);

  const { data: rolesData } = useSettingsRoles();
  const { data, loading, error, refetch } = useSettingsUsers({
    page,
    pageSize,
    search: debouncedSearch || undefined,
    role: role || undefined,
    status,
    presence,
    sortBy,
    sortOrder,
  });

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
                title={t("settings.users.directory", "User directory")}
                description={t("settings.users.directoryDesc", "All accounts in this organization.")}
                searchValue={search}
                onSearchChange={setSearch}
                endAddon={
                  <ToolbarPagination
                    pagination={data?.pagination}
                    onPageChange={onPageChange}
                    disabled={loading}
                  />
                }
                actions={
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label={t("settings.users.filterRole", "Role")}
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className={cn(selectClassName, "min-w-[8rem]")}
                    >
                      <option value="">{t("settings.users.allRoles", "All roles")}</option>
                      {(rolesData?.data ?? []).map((r) => (
                        <option key={r.id} value={r.code}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <select
                      aria-label={t("common.status")}
                      value={status}
                      onChange={(e) => setStatus(e.target.value as typeof status)}
                      className={cn(selectClassName, "min-w-[7rem]")}
                    >
                      <option value="all">{t("common.all", "All")}</option>
                      <option value="active">{t("common.active")}</option>
                      <option value="inactive">{t("common.inactive")}</option>
                    </select>
                    <select
                      aria-label={t("presence.status", "Presence")}
                      value={presence}
                      onChange={(e) => setPresence(e.target.value as typeof presence)}
                      className={cn(selectClassName, "min-w-[7rem]")}
                    >
                      <option value="all">{t("presence.any", "Any presence")}</option>
                      <option value="online">{t("presence.online", "Online")}</option>
                      <option value="away">{t("presence.away", "Away")}</option>
                      <option value="offline">{t("presence.offline", "Offline")}</option>
                    </select>
                    <select
                      aria-label={t("common.sort", "Sort")}
                      value={`${sortBy}:${sortOrder}`}
                      onChange={(e) => {
                        const [by, order] = e.target.value.split(":") as [
                          typeof sortBy,
                          typeof sortOrder,
                        ];
                        setSortBy(by);
                        setSortOrder(order);
                      }}
                      className={cn(selectClassName, "min-w-[9rem]")}
                    >
                      <option value="name:asc">{t("settings.users.sortNameAsc", "Name A–Z")}</option>
                      <option value="name:desc">{t("settings.users.sortNameDesc", "Name Z–A")}</option>
                      <option value="createdAt:desc">
                        {t("settings.users.sortNewest", "Newest first")}
                      </option>
                      <option value="createdAt:asc">
                        {t("settings.users.sortOldest", "Oldest first")}
                      </option>
                      <option value="email:asc">{t("settings.users.sortEmail", "Email A–Z")}</option>
                      <option value="lastLoginAt:desc">
                        {t("settings.users.sortLastLogin", "Last login")}
                      </option>
                    </select>
                    <select
                      aria-label={t("pagination.pageSize", "Rows per page")}
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className={cn(selectClassName, "min-w-[5rem]")}
                    >
                      {PAGE_SIZES.map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </select>
                  </div>
                }
              />
              <DataTable
                columns={userColumns}
                data={data?.data ?? []}
                emptyTitle={t("settings.users.empty", "No users found")}
                emptyDescription={t("settings.users.emptyDesc", "Try adjusting search or filters.")}
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
