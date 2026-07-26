"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/data-display/data-table";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { ModuleLayout } from "@/components/layout/module-layout";
import { HrNavLinks } from "@/components/hr/hr-gate";
import { HrDetailSkeleton } from "@/components/hr/hr-page-skeleton";
import { EmploymentStatusBadge } from "@/components/hr/hr-status-badge";
import { EmployeePersonChip } from "@/components/avatar/person-chips";
import {
  EntityAudit,
  EntityActionBar,
  EntityEmptyState,
  EntityFieldGrid,
  EntityHeader,
  EntityMetrics,
  EntityRelations,
  EntitySection,
  EntityStatus,
  EntityTableSection,
  EntityTitle,
  HrWorkspace,
} from "@/components/entity-workspace";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { useHrDepartments, useHrPosition, useUpdatePosition } from "@/lib/hooks/use-hr";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { formatDisplayDate } from "@/lib/date";
import { inputClassName } from "@/lib/form-utils";
import type { EntityAction } from "@/lib/entity-workspace";
import type { ColumnDef } from "@tanstack/react-table";
import { HR_PERMISSIONS, type EmploymentStatus, type HrPositionDetail } from "@ierp/shared";

type PositionEmployee = HrPositionDetail["employees"][number];

export default function PositionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { locale, t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(HR_PERMISSIONS.WRITE);
  const { data: position, loading, error, refetch } = useHrPosition(id);
  const { data: departmentsData } = useHrDepartments();
  const updateMutation = useUpdatePosition();
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editLevel, setEditLevel] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editActive, setEditActive] = useState("true");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  function openEditDialog() {
    if (!position) return;
    setEditTitle(position.title); setEditLevel(position.level); setEditDepartment(position.department.id);
    setEditActive(String(position.isActive)); setEditError(null); setEditOpen(true);
  }
  function handleEditOpenChange(open: boolean) {
    if (!shouldAllowEditDialogClose(editSubmitting, open)) return;
    setEditOpen(open);
  }
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!position || editSubmitting || !editTitle.trim() || !editLevel.trim() || !editDepartment) return;
    setEditSubmitting(true); setEditError(null);
    try {
      await updateMutation.mutateAsync({ id, input: { title: editTitle.trim(), level: editLevel.trim(), departmentId: editDepartment, isActive: editActive === "true" } });
      setEditOpen(false); setActionSuccess(t("masterData.saved"));
    } catch (err) { setEditError(mapTransactionUiError(err, t("form.submitFailed"))); }
    finally { setEditSubmitting(false); }
  }

  const employeeColumns: ColumnDef<PositionEmployee>[] = useMemo(
    () => [
      {
        accessorKey: "employeeNumber",
        header: t("masterData.employeeNumber", "Employee #"),
        cell: ({ row }) => (
          <Link
            href={`/dashboard/hr/employees/${row.original.id}`}
            className="ew-ltr-isolate cursor-pointer font-mono text-sm text-[var(--accent)] hover:underline"
          >
            {row.original.employeeNumber}
          </Link>
        ),
      },
      {
        accessorKey: "fullName",
        header: t("masterData.name", "Name"),
        cell: ({ row }) => (
          <Link
            href={`/dashboard/hr/employees/${row.original.id}`}
            className="cursor-pointer hover:opacity-90"
          >
            <EmployeePersonChip
              employee={{
                id: row.original.id,
                fullName: row.original.fullName,
                employeeNumber: row.original.employeeNumber,
                hasAvatar: row.original.hasAvatar,
              }}
              showPresence={false}
            />
          </Link>
        ),
      },
      {
        accessorKey: "employmentStatus",
        header: t("masterData.employmentStatus", "Status"),
        cell: ({ row }) => (
          <EmploymentStatusBadge status={row.original.employmentStatus as EmploymentStatus} />
        ),
      },
      {
        accessorKey: "hireDate",
        header: t("masterData.hireDate"),
        cell: ({ row }) => (
          <span className="ew-ltr-isolate tabular-nums">{formatDisplayDate(row.original.hireDate, locale)}</span>
        ),
      },
    ],
    [locale, t]
  );

  if (loading) {
    return (
      <ModuleLayout>
        <HrDetailSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !position) {
    return (
      <ModuleLayout maxWidth="lg">
        <HrWorkspace
          entityType="position"
          entityId={id}
          error={error ?? t("hr.positionNotFound", "Position not found")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }
  const headerActions: EntityAction[] = canWrite ? [{
    id: "edit", label: t("entityWorkspace.action.edit"), icon: <Pencil className="h-3.5 w-3.5" aria-hidden />,
    kind: "primary", capability: "edit", onSelect: openEditDialog,
  }] : [];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/hr/positions">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("hr.backToPositions", "Back to positions")}
          </Link>
        </Button>
      </div>

      <HrNavLinks />
      <ActionFeedback success={actionSuccess} />

      <HrWorkspace
        entityType="position"
        entityId={position.id}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: t("hr.positionsTitle"), href: "/dashboard/hr/positions" },
              { label: position.title },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={position.title}
                  subtitle={`${position.department.name} · ${position.level}`}
                  trailing={
                    <EntityStatus
                      label={position.isActive ? t("common.active") : t("common.inactive")}
                      variant={position.isActive ? "success" : "secondary"}
                    />
                  }
                />
              </div>
              <EntityActionBar actions={headerActions} capabilities={canWrite ? ["edit"] : []} />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              {
                id: "dept",
                label: t("masterData.department"),
                value: position.department.name,
              },
              {
                id: "level",
                label: t("hr.level"),
                value: position.level,
              },
              {
                id: "count",
                label: t("hr.employeeCount"),
                value: String(position.employeeCount),
              },
            ]}
          />
        }
        main={
          <>
            <EntitySection id="overview" title={t("entityWorkspace.summary")} defaultOpen>
              <EntityFieldGrid
                fields={[
                  {
                    id: "department",
                    label: t("masterData.department"),
                    value: position.department.name,
                    span: "md",
                  },
                  {
                    id: "dept-code",
                    label: t("masterData.departmentCode", "Department code"),
                    value: position.department.code,
                    mono: true,
                    span: "sm",
                  },
                  {
                    id: "level",
                    label: t("hr.level"),
                    value: position.level,
                    span: "sm",
                  },
                  {
                    id: "status",
                    label: t("masterData.employmentStatus", "Status"),
                    value: position.isActive ? t("common.active") : t("common.inactive"),
                    span: "sm",
                  },
                ]}
              />
            </EntitySection>

            <EntityTableSection id="employees" title={t("hr.employeeCount")}>
              {position.employees.length === 0 ? (
                <div className="p-4">
                  <EntityEmptyState
                    variant="empty"
                    title={t("hr.noEmployeesInPosition", "No employees in this position.")}
                  />
                </div>
              ) : (
                <DataTable columns={employeeColumns} data={position.employees} pageSize={20} />
              )}
            </EntityTableSection>
          </>
        }
        footer={<EntityAudit meta={{ id: position.id }} />}
        sidebar={
          <EntityRelations
            items={[
              {
                id: "department",
                label: position.department.name,
                description: t("masterData.department"),
                meta: position.department.code,
                href: "/dashboard/hr/departments",
              },
            ]}
          />
        }
      />
      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{t("entityWorkspace.action.edit")} — {position.title}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => void handleEditSubmit(e)}>
            <ActionFeedback error={editError} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Title" required><input className={inputClassName} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} disabled={editSubmitting} /></FormField>
              <FormField label={t("hr.level")} required><input className={inputClassName} value={editLevel} onChange={(e) => setEditLevel(e.target.value)} disabled={editSubmitting} /></FormField>
              <SelectField id="position-department" label={t("masterData.department")} value={editDepartment} onChange={setEditDepartment} options={(departmentsData?.data ?? []).map((d) => ({ value: d.id, label: d.name }))} disabled={editSubmitting} />
              <SelectField id="position-active" label="Status" value={editActive} onChange={setEditActive} options={[{ value: "true", label: t("common.active") }, { value: "false", label: t("common.inactive") }]} disabled={editSubmitting} />
            </div>
            <FormActions cancelLabel={t("form.cancel")} submitLabel={t("masterData.saveChanges")} loading={editSubmitting} disabled={editSubmitting} onCancel={() => handleEditOpenChange(false)} />
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
