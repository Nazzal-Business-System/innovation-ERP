"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Loader2, RotateCcw, Save, Shield } from "lucide-react";
import type { SettingsPermission, SettingsRole, UpdateRolePermissionsResponse } from "@ierp/shared";
import { ROLES_PERMISSIONS } from "@ierp/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PremiumCard } from "@/components/motion/premium-card";
import { useAuthStore } from "@/lib/auth-store";
import { apiFetch, ApiError } from "@/lib/api-client";
import { useI18n, usePermissionLabel, useRoleLabel, useSectionLabel } from "@/lib/i18n";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { PERMISSION_SECTION_ORDER } from "@/lib/permission-sections";
import { cn } from "@/lib/utils";

function RoleLabel({ code }: { code: string }) {
  const label = useRoleLabel(code);
  return <>{label}</>;
}

interface RolesPermissionsEditorProps {
  roles: SettingsRole[];
  permissions: SettingsPermission[];
  onRolesUpdated: (roles: SettingsRole[]) => void;
}

type DraftState = Record<string, boolean>;

function buildDraft(role: SettingsRole | null, catalog: SettingsPermission[]): DraftState {
  const granted = new Set(role?.permissions.map((p) => p.key) ?? []);
  return Object.fromEntries(catalog.map((p) => [p.id, granted.has(p.key)]));
}

function groupBySection(permissions: SettingsPermission[]) {
  const groups = new Map<string, SettingsPermission[]>();
  for (const perm of permissions) {
    const list = groups.get(perm.section) ?? [];
    list.push(perm);
    groups.set(perm.section, list);
  }
  for (const [, list] of groups) {
    list.sort((a, b) => a.action.localeCompare(b.action));
  }
  return groups;
}

const CRITICAL_SELF_KEYS = new Set([
  ROLES_PERMISSIONS.WRITE,
  ROLES_PERMISSIONS.READ,
  "settings.read",
]);

export function RolesPermissionsEditor({
  roles,
  permissions,
  onRolesUpdated,
}: RolesPermissionsEditorProps) {
  const { t } = useI18n();
  const { has } = usePermissions();
  const canEdit = has(ROLES_PERMISSIONS.WRITE);
  const userRoles = useAuthStore((s) => s.roles);

  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? "");
  const selectedRole = roles.find((r) => r.id === selectedRoleId) ?? roles[0] ?? null;

  const [draft, setDraft] = useState<DraftState>(() => buildDraft(selectedRole, permissions));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const sectionGroups = useMemo(() => groupBySection(permissions), [permissions]);

  const orderedSections = useMemo(() => {
    const known = PERMISSION_SECTION_ORDER.filter((s) => sectionGroups.has(s));
    const extra = [...sectionGroups.keys()].filter((s) => !PERMISSION_SECTION_ORDER.includes(s as never));
    return [...known, ...extra];
  }, [sectionGroups]);

  useEffect(() => {
    setDraft(buildDraft(selectedRole, permissions));
    setSaveError(null);
    setSaveSuccess(false);
  }, [selectedRole, permissions]);

  const isDirty = useMemo(() => {
    if (!selectedRole) return false;
    const baseline = buildDraft(selectedRole, permissions);
    return permissions.some((p) => draft[p.id] !== baseline[p.id]);
  }, [draft, selectedRole, permissions]);

  const editingOwnRole = useMemo(
    () => !!selectedRole && userRoles.some((r) => r.code === selectedRole.code),
    [selectedRole, userRoles]
  );

  const togglePermission = useCallback(
    (perm: SettingsPermission, next: boolean) => {
      if (!canEdit) return;

      setDraft((prev) => {
        const updated = { ...prev, [perm.id]: next };

        if (perm.action === "write" && next) {
          const readPerm = permissions.find((p) => p.section === perm.section && p.action === "read");
          if (readPerm) updated[readPerm.id] = true;
        }
        if (perm.action === "read" && !next) {
          const writePerm = permissions.find((p) => p.section === perm.section && p.action === "write");
          if (writePerm) updated[writePerm.id] = false;
        }

        return updated;
      });
      setSaveSuccess(false);
      setSaveError(null);
    },
    [canEdit, permissions]
  );

  const handleReset = () => {
    setDraft(buildDraft(selectedRole, permissions));
    setSaveError(null);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!selectedRole || !canEdit) return;

    if (editingOwnRole) {
      const baselineKeys = new Set(selectedRole.permissions.map((p) => p.key));
      for (const perm of permissions) {
        const key = perm.key;
        if (!CRITICAL_SELF_KEYS.has(key) || !baselineKeys.has(key)) continue;
        const wasGranted = baselineKeys.has(key);
        const willGrant = !!draft[perm.id];
        if (wasGranted && !willGrant) {
          setSaveError(t("settings.roles.cannotRevokeOwn"));
          return;
        }
      }
    }

    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const payload = {
        permissions: permissions.map((p) => ({
          permissionId: p.id,
          granted: !!draft[p.id],
        })),
      };

      const res = await apiFetch<UpdateRolePermissionsResponse>(
        `/settings/roles/${selectedRole.id}/permissions`,
        { method: "PATCH", body: JSON.stringify(payload) }
      );

      const nextRoles = roles.map((r) => (r.id === res.role.id ? res.role : r));
      onRolesUpdated(nextRoles);

      if (editingOwnRole) {
        await useAuthStore.getState().refreshSession();
      }

      setSaveSuccess(true);
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : t("settings.roles.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  if (!selectedRole) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {roles.map((role) => (
          <Button
            key={role.id}
            type="button"
            variant={role.id === selectedRoleId ? "default" : "secondary"}
            size="sm"
            className="cursor-pointer gap-2"
            onClick={() => setSelectedRoleId(role.id)}
          >
            <Shield className="h-3.5 w-3.5" aria-hidden />
            <RoleLabel code={role.code} />
          </Button>
        ))}
      </div>

      <PremiumCard className="overflow-hidden">
        <Card className="border-0 bg-transparent shadow-none">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <RoleLabel code={selectedRole.code} />
              </CardTitle>
              <CardDescription>
                {selectedRole.description ?? t("settings.roles.selectRole")}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {t("settings.roles.permissionCount")}: {Object.values(draft).filter(Boolean).length}
              </Badge>
              {isDirty && (
                <Badge variant="outline" className="text-amber-600">
                  {t("settings.roles.unsaved")}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canEdit && (
              <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)]/40 px-3 py-2 text-sm text-[var(--muted)]">
                {t("settings.roles.readOnly")}
              </p>
            )}

            <div className="grid gap-4 lg:grid-cols-2">
              {orderedSections.map((section) => (
                <PermissionSectionCard
                  key={section}
                  section={section}
                  perms={sectionGroups.get(section) ?? []}
                  draft={draft}
                  canEdit={canEdit}
                  onToggle={togglePermission}
                />
              ))}
            </div>

            {canEdit && (
              <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border-subtle)] pt-4">
                <Button
                  type="button"
                  className="cursor-pointer gap-2"
                  disabled={!isDirty || saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden />
                  )}
                  {saving ? t("settings.roles.saving") : t("settings.roles.save")}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="cursor-pointer gap-2"
                  disabled={!isDirty || saving}
                  onClick={handleReset}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  {t("settings.roles.reset")}
                </Button>
                {saveSuccess && (
                  <span className="flex items-center gap-1 text-sm text-emerald-600">
                    <Check className="h-4 w-4" aria-hidden />
                    {t("settings.roles.saved")}
                  </span>
                )}
                {saveError && (
                  <span className="text-sm text-[var(--destructive)]">{saveError}</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </PremiumCard>
    </div>
  );
}

function PermissionSectionCard({
  section,
  perms,
  draft,
  canEdit,
  onToggle,
}: {
  section: string;
  perms: SettingsPermission[];
  draft: DraftState;
  canEdit: boolean;
  onToggle: (perm: SettingsPermission, next: boolean) => void;
}) {
  const { t } = useI18n();
  const sectionLabel = useSectionLabel(section);

  return (
    <Card className="border-[var(--border-subtle)] bg-[var(--card)]">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{sectionLabel}</CardTitle>
        <CardDescription className="text-xs">
          {t(`permissions.sectionDesc.${section}`, "")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {perms.map((perm) => (
          <PermissionToggleRow
            key={perm.id}
            perm={perm}
            checked={!!draft[perm.id]}
            canEdit={canEdit}
            onToggle={onToggle}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function PermissionToggleRow({
  perm,
  checked,
  canEdit,
  onToggle,
}: {
  perm: SettingsPermission;
  checked: boolean;
  canEdit: boolean;
  onToggle: (perm: SettingsPermission, next: boolean) => void;
}) {
  const { t } = useI18n();
  const label = usePermissionLabel(perm.key);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] px-3 py-2">
      <div className="min-w-0 flex-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{label}</p>
          </TooltipTrigger>
          <TooltipContent side="top" className="font-mono text-[10px]">
            {t("settings.roles.debugKey")}: {perm.key}
          </TooltipContent>
        </Tooltip>
      </div>
      <Switch
        checked={checked}
        disabled={!canEdit}
        onCheckedChange={(next) => onToggle(perm, next)}
        aria-label={label}
        className={cn(!canEdit && "opacity-80")}
      />
    </div>
  );
}
