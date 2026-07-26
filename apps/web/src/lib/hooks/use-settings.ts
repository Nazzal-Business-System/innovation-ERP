"use client";

import { useAsyncData, STALE } from "@/lib/hooks/use-async-data";
import type {
  PaginatedResponse,
  SettingsAuditLog,
  SettingsBranch,
  SettingsOrganization,
  SettingsOverview,
  SettingsPermission,
  SettingsPreference,
  SettingsRole,
  SettingsUser,
} from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";

export function useSettingsOverview() {
  return useAsyncData(["settings-1"], () => apiFetch<SettingsOverview>("/settings/overview"), { staleTime: STALE.dashboard });
}

export function useSettingsOrganization() {
  return useAsyncData(["settings-2"], () => apiFetch<{ organization: SettingsOrganization }>("/settings/organization"), { staleTime: STALE.operational });
}

export function useSettingsBranches() {
  return useAsyncData(["settings-3"], () => apiFetch<{ data: SettingsBranch[] }>("/settings/branches"), { staleTime: STALE.reference });
}

export function useSettingsUsers(params: { page?: number } = {}) {
  const { page } = params;
  return useAsyncData(["settings-4", page], () => {
    const query = new URLSearchParams();
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<PaginatedResponse<SettingsUser>>(`/settings/users${qs ? `?${qs}` : ""}`);
  }, { staleTime: STALE.operational, keepPrevious: true });
}

export function useSettingsRoles() {
  return useAsyncData(["settings-5"], () => apiFetch<{ data: SettingsRole[] }>("/settings/roles"), { staleTime: STALE.reference });
}

export function useSettingsPermissions() {
  return useAsyncData(["settings-6"], () => apiFetch<{ data: SettingsPermission[] }>("/settings/permissions"), { staleTime: STALE.operational });
}

export function useSettingsPreferences() {
  return useAsyncData(["settings-7"], () => apiFetch<{ data: SettingsPreference[] }>("/settings/preferences"), { staleTime: STALE.operational });
}

export function useSettingsAuditLogs(params: {
  search?: string;
  action?: string;
  entity?: string;
  page?: number;
}) {
  const { search, action, entity, page } = params;
  return useAsyncData(["settings-8", search, action, entity, page], () => {
    const query = new URLSearchParams();
    if (search) query.set("search", search);
    if (action) query.set("action", action);
    if (entity) query.set("entity", entity);
    if (page) query.set("page", String(page));
    const qs = query.toString();
    return apiFetch<PaginatedResponse<SettingsAuditLog>>(`/settings/audit-logs${qs ? `?${qs}` : ""}`);
  }, { staleTime: STALE.operational, keepPrevious: true });
}
