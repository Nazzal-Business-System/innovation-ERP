"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/data-display/data-table";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DatePicker } from "@/components/forms/date-picker";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { ModuleLayout } from "@/components/layout/module-layout";
import { ProjectsNavLinks } from "@/components/projects/projects-gate";
import {
  milestoneColumns,
  taskColumns,
} from "@/components/projects/projects-columns";
import { ProjectsDetailSkeleton } from "@/components/projects/projects-page-skeleton";
import {
  EntityAudit,
  EntityActionBar,
  EntityEmptyState,
  EntityFieldGrid,
  EntityHeader,
  EntityLinkedAttachments,
  EntityMetrics,
  EntityNotesEditor,
  EntityOwner,
  EntityRelations,
  EntitySection,
  EntityStatus,
  EntityTableSection,
  EntityTitle,
  EntityWorkflow,
  OperationalWorkspace,
} from "@/components/entity-workspace";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { useProject, useUpdateProject } from "@/lib/hooks/use-projects";
import { useSalesCustomers } from "@/lib/hooks/use-sales";
import { useSettingsUsers } from "@/lib/hooks/use-settings";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/date";
import { inputClassName } from "@/lib/form-utils";
import type { EntityAction } from "@/lib/entity-workspace";
import type { BadgeProps } from "@/components/ui/badge";
import { PROJECTS_PERMISSIONS, type ProjectStatus } from "@ierp/shared";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "PLANNING", label: "Planning" },
  { value: "ACTIVE", label: "Active" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

function statusVariant(status: ProjectStatus): BadgeProps["variant"] {
  if (status === "ACTIVE" || status === "COMPLETED") return "success";
  if (status === "ON_HOLD") return "warning";
  if (status === "CANCELLED") return "destructive";
  return "secondary";
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { locale, t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(PROJECTS_PERMISSIONS.WRITE);
  const { data: project, loading, error, refetch } = useProject(id);
  const updateProjectMutation = useUpdateProject();
  const { data: customersData } = useSalesCustomers({ active: true, page: 1 });
  const { data: usersData } = useSettingsUsers({ page: 1 });
  const [newStatus, setNewStatus] = useState("");
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editTargetDate, setEditTargetDate] = useState("");
  const [editProgress, setEditProgress] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editCustomerId, setEditCustomerId] = useState("");
  const [editManagerId, setEditManagerId] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEditDialog() {
    if (!project) return;
    setEditName(project.name);
    setEditStartDate(project.startDate ?? "");
    setEditTargetDate(project.targetDate ?? "");
    setEditProgress(String(project.progress));
    setEditBudget(project.budget.replace(/[^\d.]/g, ""));
    setEditCustomerId(project.customer?.id ?? "");
    setEditManagerId(project.manager?.id ?? "");
    setEditError(null);
    setEditOpen(true);
  }

  function handleEditOpenChange(open: boolean) {
    if (!shouldAllowEditDialogClose(editSubmitting, open)) return;
    setEditOpen(open);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!project || editSubmitting) return;
    const progress = Number(editProgress);
    const budget = Number(editBudget);
    if (!editName.trim() || !Number.isFinite(progress) || progress < 0 || progress > 100 || !Number.isFinite(budget) || budget < 0) {
      setEditError(t("form.validationError", "Check the entered values."));
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateProjectMutation.mutateAsync({
        id,
        input: {
          name: editName.trim(), customerId: editCustomerId || null, managerId: editManagerId || null,
          startDate: editStartDate || null, targetDate: editTargetDate || null, progress, budget,
        },
      });
      setEditOpen(false);
      setActionSuccess(t("projects.projectUpdated", "Project updated"));
    } catch (err) {
      setEditError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleStatusChange() {
    if (!newStatus || !project) return;
    setUpdating(true);
    setActionError(null);
    try {
      await updateProjectMutation.mutateAsync({
        id,
        input: { status: newStatus as ProjectStatus },
      });
      setActionSuccess(t("projects.statusUpdated"));
      setNewStatus("");
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <ProjectsDetailSkeleton />;

  if (error || !project) {
    return (
      <ModuleLayout maxWidth="lg">
        <OperationalWorkspace
          entityType="project"
          entityId={id}
          error={error ?? t("projects.projectNotFound")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }
  const headerActions: EntityAction[] = canWrite
    ? [{ id: "edit", label: t("entityWorkspace.action.edit"), icon: <Pencil className="h-3.5 w-3.5" aria-hidden />, kind: "primary", capability: "edit", onSelect: openEditDialog }]
    : [];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/projects">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("projects.backToProjects")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={actionError} />
      <ProjectsNavLinks />

      <OperationalWorkspace
        entityType="project"
        entityId={project.id}
        readOnly={!canWrite}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: "Projects", href: "/dashboard/projects" },
              { label: project.code },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <EntityTitle
              title={project.name}
              subtitle={
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="ew-ltr-isolate font-mono text-xs">{project.code}</span>
                  {project.customer ? <span>· {project.customer.name}</span> : null}
                </span>
              }
              trailing={
                <EntityStatus
                  label={project.status.replace(/_/g, " ")}
                  variant={statusVariant(project.status)}
                />
              }
            />
            <EntityActionBar actions={headerActions} capabilities={canWrite ? ["edit"] : []} />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              { id: "progress", label: t("projects.averageProgress"), value: `${project.progress}%` },
              { id: "budget", label: "Budget", value: project.budget },
              { id: "tasks", label: t("nav.tasks"), value: String(project.tasks.length) },
              { id: "milestones", label: t("nav.milestones"), value: String(project.milestones.length) },
            ]}
          />
        }
        main={
          <>
            <EntitySection id="project-details" title={t("projects.projectDetail")} defaultOpen>
              <EntityFieldGrid
                fields={[
                  { id: "code", label: "Code", value: project.code, mono: true, span: "sm" },
                  { id: "status", label: "Status", value: project.status.replace(/_/g, " "), span: "sm" },
                  { id: "start", label: "Start Date", value: formatDisplayDate(project.startDate, locale), span: "sm" },
                  { id: "target", label: "Target Date", value: formatDisplayDate(project.targetDate, locale), span: "sm" },
                  { id: "budget", label: "Budget", value: project.budget, span: "md" },
                  {
                    id: "progress",
                    label: t("projects.averageProgress"),
                    value: (
                      <div className="flex items-center gap-3">
                        <div className="h-2 min-w-24 flex-1 overflow-hidden rounded-full bg-[var(--muted-bg)]">
                          <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${project.progress}%` }} />
                        </div>
                        <span className="tabular-nums">{project.progress}%</span>
                      </div>
                    ),
                    span: "lg",
                  },
                ]}
              />
            </EntitySection>

            {project.customer ? (
              <EntityRelations
                title="Customer"
                items={[{
                  id: project.customer.id,
                  label: project.customer.name,
                  description: project.customer.code,
                  meta: project.customer.code,
                  href: `/dashboard/sales/customers/${project.customer.id}`,
                }]}
              />
            ) : null}

            <EntityNotesEditor value={project.notes} canEdit={canWrite} onSave={async (notes) => {
              await updateProjectMutation.mutateAsync({ id, input: { notes } });
            }} />

            <EntityTableSection id="tasks" title={`${t("nav.tasks")} (${project.tasks.length})`}>
              {project.tasks.length ? (
                <DataTable columns={taskColumns} data={project.tasks} pageSize={10} />
              ) : (
                <div className="p-4"><EntityEmptyState variant="empty" title={t("common.noData")} /></div>
              )}
            </EntityTableSection>

            <EntityTableSection id="milestones" title={`${t("nav.milestones")} (${project.milestones.length})`}>
              {project.milestones.length ? (
                <DataTable columns={milestoneColumns} data={project.milestones} pageSize={10} />
              ) : (
                <div className="p-4"><EntityEmptyState variant="empty" title={t("common.noData")} /></div>
              )}
            </EntityTableSection>

            <EntityLinkedAttachments module="PROJECTS" entityType="project" entityId={id} />
          </>
        }
        sidebar={
          <>
            <EntityOwner
              name={project.manager?.name ?? "Unassigned"}
              role={project.manager?.email}
              userId={project.manager?.id}
              hasAvatar={project.manager?.hasAvatar}
              avatarUpdatedAt={project.manager?.avatarUpdatedAt}
              lastSeenAt={project.manager?.lastSeenAt}
              lastActiveAt={project.manager?.lastActiveAt}
              defaultOpen
            />
            <EntityWorkflow
              statusLabel={project.status.replace(/_/g, " ")}
              defaultOpen
              actions={
                canWrite ? (
                  <div className="flex w-full flex-col gap-3">
                    <SelectField
                      id="projectStatus"
                      label="Status"
                      value={newStatus || project.status}
                      onChange={setNewStatus}
                      options={STATUS_OPTIONS}
                      disabled={updating}
                      loading={updating}
                    />
                    <Button
                      type="button"
                      loading={updating}
                      loadingText={t("form.saving")}
                      disabled={updating || !newStatus || newStatus === project.status}
                      onClick={() => void handleStatusChange()}
                    >
                      {t("projects.changeStatus")}
                    </Button>
                  </div>
                ) : undefined
              }
            />
          </>
        }
        footer={
          <EntityAudit
            meta={{
              id: project.id,
              createdAt: formatDisplayDateTime(project.createdAt, locale),
              updatedAt: formatDisplayDateTime(project.updatedAt, locale),
            }}
          />
        }
      />
      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{t("entityWorkspace.action.edit")} — {project.name}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => void handleEditSubmit(e)}>
            <ActionFeedback error={editError} />
            <FormField label="Name" required><input className={inputClassName} value={editName} onChange={(e) => setEditName(e.target.value)} disabled={editSubmitting} /></FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField id="project-customer" label="Customer" value={editCustomerId} onChange={setEditCustomerId} options={[{ value: "", label: "No customer" }, ...(customersData?.data ?? []).map((customer) => ({ value: customer.id, label: customer.name }))]} disabled={editSubmitting} />
              <SelectField id="project-manager" label="Manager" value={editManagerId} onChange={setEditManagerId} options={[{ value: "", label: "Unassigned" }, ...(usersData?.data ?? []).map((user) => ({ value: user.id, label: user.name }))]} disabled={editSubmitting} />
              <DatePicker id="project-start" label="Start Date" value={editStartDate} onChange={setEditStartDate} optional disabled={editSubmitting} />
              <DatePicker id="project-target" label="Target Date" value={editTargetDate} onChange={setEditTargetDate} optional disabled={editSubmitting} />
              <FormField label="Progress" required><input type="number" min={0} max={100} className={inputClassName} value={editProgress} onChange={(e) => setEditProgress(e.target.value)} disabled={editSubmitting} /></FormField>
              <FormField label="Budget" required><input type="number" min={0} step="0.01" className={inputClassName} value={editBudget} onChange={(e) => setEditBudget(e.target.value)} disabled={editSubmitting} /></FormField>
            </div>
            <FormActions cancelLabel={t("form.cancel")} submitLabel={t("projects.saveChanges")} loading={editSubmitting} disabled={editSubmitting} onCancel={() => handleEditOpenChange(false)} />
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
