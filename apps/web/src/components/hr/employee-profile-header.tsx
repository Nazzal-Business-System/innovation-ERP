"use client";

import Link from "next/link";
import { MapPin, UserRound } from "lucide-react";
import { EmployeeAvatarEditor } from "@/components/hr/employee-avatar-editor";
import { PresenceBadge } from "@/components/presence/presence-badge";
import {
  EntityActionBar,
  EntityHeader,
  EntityStatus,
} from "@/components/entity-workspace";
import type { EntityAction } from "@/lib/entity-workspace";
import { resolveLinkedUserPresence } from "@/lib/avatar/presence";
import { formatEmployeeTenure } from "@/lib/hr/employee-profile";
import { formatDisplayDate } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import { EMPLOYMENT_STATUS_LABELS } from "@/components/hr/hr-status-badge";
import type { HrEmployeeDetail } from "@ierp/shared";

export function EmployeeProfileHeader({
  employee,
  actions,
  capabilities,
  canEditPhoto,
  onPhotoSuccess,
}: {
  employee: HrEmployeeDetail;
  actions: EntityAction[];
  capabilities?: ReadonlySet<string> | readonly string[];
  canEditPhoto: boolean;
  onPhotoSuccess?: (message: string) => void;
}) {
  const { locale, t } = useI18n();
  const tenure = formatEmployeeTenure(employee.hireDate);
  const linked = Boolean(employee.accountUserId);
  const presence = resolveLinkedUserPresence({
    accountUserId: employee.accountUserId,
    lastSeenAt: employee.lastSeenAt,
    lastActiveAt: employee.lastActiveAt,
  });
  const employmentLabel = EMPLOYMENT_STATUS_LABELS[employee.employmentStatus];
  /** Distinct from lifecycle Active/Inactive — never duplicate “Active” beside the name. */
  const showEmploymentBadge =
    employee.employmentStatus === "PROBATION" ||
    employee.employmentStatus === "ON_LEAVE" ||
    employee.employmentStatus === "TERMINATED";

  return (
    <EntityHeader
      breadcrumbs={[
        { label: t("nav.employees"), href: "/dashboard/hr/employees" },
        { label: employee.employeeNumber },
      ]}
    >
      <div className="flex min-w-0 flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-start">
          <EmployeeAvatarEditor
            employeeId={employee.id}
            fullName={employee.fullName}
            hasAvatar={employee.hasAvatar}
            avatarUpdatedAt={employee.avatarUpdatedAt}
            canEdit={canEditPhoto}
            onSuccess={onPhotoSuccess}
            presence={presence}
          />

          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.75rem]">
                {employee.fullName}
              </h1>
              <EntityStatus
                label={employee.isActive ? t("common.active") : t("common.inactive")}
                variant={employee.isActive ? "success" : "secondary"}
              />
              {showEmploymentBadge ? (
                <EntityStatus
                  label={employmentLabel}
                  variant={
                    employee.employmentStatus === "TERMINATED"
                      ? "destructive"
                      : employee.employmentStatus === "ON_LEAVE"
                        ? "warning"
                        : "secondary"
                  }
                />
              ) : null}
            </div>

            {linked ? (
              <div className="flex justify-center sm:justify-start">
                <PresenceBadge
                  lastSeenAt={employee.lastSeenAt}
                  lastActiveAt={employee.lastActiveAt}
                  showLabel
                />
              </div>
            ) : (
              <p className="text-xs text-[var(--muted)]">
                {t("presence.noAccount", "No account")}
              </p>
            )}

            <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-[var(--muted)] sm:justify-start">
              <span className="ew-ltr-isolate font-mono text-xs font-medium text-[var(--foreground)]">
                {employee.employeeNumber}
              </span>
              <span aria-hidden>·</span>
              <span>{employee.position.title}</span>
              <span aria-hidden>·</span>
              <span>{employee.department.name}</span>
              <span aria-hidden>·</span>
              <span>
                {t("hr.employmentStatus", "Employment")}: {employmentLabel}
              </span>
            </p>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm text-[var(--muted)] sm:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {employee.workLocation}
              </span>
              <span>
                {t("masterData.hireDate")}:{" "}
                <span className="ew-ltr-isolate text-[var(--foreground)]">
                  {formatDisplayDate(employee.hireDate, locale)}
                </span>
                <span className="ms-1 text-xs">({tenure})</span>
              </span>
              {employee.manager ? (
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  <Link
                    href={`/dashboard/hr/employees/${employee.manager.id}`}
                    className="cursor-pointer text-[var(--accent)] hover:underline"
                  >
                    {employee.manager.fullName}
                  </Link>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {t("hr.noManager", "No manager")}
                </span>
              )}
            </div>
          </div>
        </div>

        <EntityActionBar actions={actions} capabilities={capabilities} className="justify-center sm:justify-end" />
      </div>
    </EntityHeader>
  );
}
