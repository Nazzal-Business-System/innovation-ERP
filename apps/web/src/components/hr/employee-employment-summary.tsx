"use client";

import type { ReactNode } from "react";
import {
  EntitySection,
} from "@/components/entity-workspace";
import { formatDisplayDate } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import type { HrEmployeeDetail } from "@ierp/shared";

export function EmployeeEmploymentSummary({
  employee,
}: {
  employee: HrEmployeeDetail;
}) {
  const { locale, t } = useI18n();

  const rows: Array<{ id: string; label: string; value: ReactNode }> = [
    {
      id: "email",
      label: t("masterData.email"),
      value: (
        <a
          href={`mailto:${employee.email}`}
          className="cursor-pointer break-all text-[var(--accent)] hover:underline"
        >
          {employee.email}
        </a>
      ),
    },
    {
      id: "phone",
      label: t("masterData.phone"),
      value: employee.phone ?? "—",
    },
    {
      id: "level",
      label: t("hr.positionLevel", "Level"),
      value: employee.position.level,
    },
    ...(employee.canViewSalary
      ? [
          {
            id: "salary",
            label: t("masterData.salary"),
            value: employee.salary ?? "—",
          },
        ]
      : []),
  ];

  return (
    <EntitySection id="profile-summary" title={t("hr.profileSummary", "Profile summary")} defaultOpen>
      <dl className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background)]/40 px-3 py-2.5"
          >
            <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              {row.label}
            </dt>
            <dd className="mt-1 text-sm text-[var(--foreground)]">{row.value}</dd>
          </div>
        ))}
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background)]/40 px-3 py-2.5 sm:col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            {t("hr.hireTenure", "Hire / tenure")}
          </dt>
          <dd className="mt-1 text-sm text-[var(--foreground)]">
            <span className="ew-ltr-isolate">{formatDisplayDate(employee.hireDate, locale)}</span>
          </dd>
        </div>
      </dl>
    </EntitySection>
  );
}
