"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DatePicker } from "@/components/forms/date-picker";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { ModuleLayout } from "@/components/layout/module-layout";
import { ProjectsNavLinks } from "@/components/projects/projects-gate";
import {
  TASK_PRIORITY_LABELS,
} from "@/components/projects/projects-columns";
import { ProjectsDetailSkeleton } from "@/components/projects/projects-page-skeleton";
import {
  EntityAudit,
  EntityActionBar,
  EntityFieldGrid,
  EntityNotesEditor,
  EntityHeader,
  EntityMetrics,
  EntityOwner,
  EntityRelations,
  EntitySection,
  EntityStatus,
  EntityTitle,
  EntityWorkflow,
  OperationalWorkspace,
} from "@/components/entity-workspace";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { useProjectTask, useUpdateTask } from "@/lib/hooks/use-projects";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useSettingsUsers } from "@/lib/hooks/use-settings";
import { inputClassName } from "@/lib/form-utils";
import { useI18n } from "@/lib/i18n";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/date";
import type { EntityAction } from "@/lib/entity-workspace";
import type { BadgeProps } from "@/components/ui/badge";
import {
  PROJECTS_PERMISSIONS,
  type ProjectTaskPriority,
  type ProjectTaskStatus,
} from "@ierp/shared";

const STATUS_OPTIONS: { value: ProjectTaskStatus; label: string }[] = [
  { value: "TODO", label: "To Do" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "REVIEW", label: "Review" },
  { value: "DONE", label: "Done" },
];

const PRIORITY_OPTIONS = Object.entries(TASK_PRIORITY_LABELS).map(([value, label]) => ({
  value,
  label,
}));

function statusVariant(status: ProjectTaskStatus): BadgeProps["variant"] {
  if (status === "DONE") return "success";
  if (status === "IN_PROGRESS") return "info";
  if (status === "REVIEW") return "warning";
  return "secondary";
}

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { locale, t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(PROJECTS_PERMISSIONS.WRITE);
  const { data: task, loading, error, refetch } = useProjectTask(id);
  const updateTaskMutation = useUpdateTask();
  const { data: usersData } = useSettingsUsers();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<ProjectTaskPriority>("MEDIUM");
  const [status, setStatus] = useState<ProjectTaskStatus>("TODO");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  function openEditDialog() {
    if (!task) return;
    setTitle(task.title);
    setDescription(task.description ?? "");
    setPriority(task.priority);
    setStatus(task.status);
    setAssigneeId(task.assigneeId ?? "");
    setDueDate(task.dueDate ?? "");
    setActionError(null);
    setEditOpen(true);
  }

  function handleEditOpenChange(open: boolean) {
    if (!shouldAllowEditDialogClose(submitting, open)) return;
    setEditOpen(open);
    if (!open) setActionError(null);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!task) return;
    setSubmitting(true);
    setActionError(null);
    try {
      await updateTaskMutation.mutateAsync({
        id,
        projectId: task.projectId,
        input: {
          title,
          description: description || null,
          priority,
          assigneeId: assigneeId || null,
          dueDate: dueDate || null,
          status,
        },
      });
      setEditOpen(false);
      setActionSuccess(t("projects.taskUpdated"));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <ProjectsDetailSkeleton />;

  if (error || !task) {
    return (
      <ModuleLayout maxWidth="lg">
        <OperationalWorkspace
          entityType="project-task"
          entityId={id}
          error={error ?? t("projects.taskNotFound")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const userOptions = [
    { value: "", label: "Unassigned" },
    ...(usersData?.data ?? []).map((u) => ({ value: u.id, label: u.name })),
  ];
  const headerActions: EntityAction[] = canWrite
    ? [{
        id: "edit",
        label: t("entityWorkspace.action.edit"),
        icon: <Pencil className="h-3.5 w-3.5" aria-hidden />,
        kind: "primary",
        capability: "edit",
        onSelect: openEditDialog,
      }]
    : [];

  return (
    <ModuleLayout maxWidth="lg">
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/projects/tasks">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("projects.backToTasks")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={actionError} />
      <ProjectsNavLinks />

      <OperationalWorkspace
        entityType="project-task"
        entityId={task.id}
        readOnly={!canWrite}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: "Projects", href: "/dashboard/projects" },
              { label: t("nav.tasks"), href: "/dashboard/projects/tasks" },
              { label: task.title },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <EntityTitle
                title={task.title}
                subtitle={
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    {task.projectCode ? <span className="ew-ltr-isolate font-mono text-xs">{task.projectCode}</span> : null}
                    {task.projectName ? <span>· {task.projectName}</span> : null}
                  </span>
                }
                trailing={<EntityStatus label={task.status.replace(/_/g, " ")} variant={statusVariant(task.status)} />}
              />
              <EntityActionBar actions={headerActions} capabilities={canWrite ? ["edit"] : []} />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              { id: "priority", label: "Priority", value: TASK_PRIORITY_LABELS[task.priority] },
              { id: "due", label: "Due Date", value: <span className="ew-ltr-isolate">{formatDisplayDate(task.dueDate, locale)}</span> },
              { id: "assignee", label: "Assignee", value: task.assignee?.name ?? "Unassigned" },
            ]}
          />
        }
        main={
          <>
            {task.projectId ? (
              <EntityRelations
                title="Project"
                items={[{
                  id: task.projectId,
                  label: task.projectName ?? task.projectCode ?? "Project",
                  description: task.projectCode,
                  meta: task.projectCode,
                  href: `/dashboard/projects/${task.projectId}`,
                }]}
              />
            ) : null}

            <EntitySection id="record-details" title={t("projects.taskDetail")} defaultOpen>
              <EntityFieldGrid
                fields={[
                  { id: "title", label: "Title", value: task.title, span: "lg" },
                  { id: "status", label: "Status", value: task.status.replace(/_/g, " "), span: "sm" },
                  { id: "priority", label: "Priority", value: TASK_PRIORITY_LABELS[task.priority], span: "sm" },
                  { id: "due-date", label: "Due Date", value: formatDisplayDate(task.dueDate, locale), span: "sm" },
                  { id: "created", label: "Created", value: formatDisplayDateTime(task.createdAt, locale), span: "md" },
                  { id: "updated", label: "Updated", value: formatDisplayDateTime(task.updatedAt, locale), span: "md" },
                ]}
              />
            </EntitySection>
            <EntityNotesEditor
              title="Description"
              value={task.description}
              canEdit={canWrite}
              onSave={async (description) => {
                await updateTaskMutation.mutateAsync({ id, projectId: task.projectId, input: { description } });
              }}
            />
          </>
        }
        sidebar={
          <>
            <EntityOwner
              name={task.assignee?.name ?? "Unassigned"}
              role={task.assignee?.email}
              userId={task.assignee?.id}
              hasAvatar={task.assignee?.hasAvatar}
              avatarUpdatedAt={task.assignee?.avatarUpdatedAt}
              lastSeenAt={task.assignee?.lastSeenAt}
              lastActiveAt={task.assignee?.lastActiveAt}
              defaultOpen
            />
            <EntityWorkflow statusLabel={task.status.replace(/_/g, " ")} defaultOpen />
          </>
        }
        footer={
          <EntityAudit
            meta={{
              id: task.id,
              createdAt: formatDisplayDateTime(task.createdAt, locale),
              updatedAt: formatDisplayDateTime(task.updatedAt, locale),
            }}
          />
        }
      />
      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{t("entityWorkspace.action.edit")} — {task.title}</DialogTitle></DialogHeader>
          <form onSubmit={(e) => void handleSave(e)} className="space-y-4">
            <ActionFeedback error={actionError} />
            <FormField label="Title" required>
              <input className={inputClassName} value={title} onChange={(e) => setTitle(e.target.value)} required disabled={submitting} />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField id="taskStatus" label="Status" value={status} onChange={(v) => setStatus(v as ProjectTaskStatus)} options={STATUS_OPTIONS} disabled={submitting} />
              <SelectField id="taskPriority" label="Priority" value={priority} onChange={(v) => setPriority(v as ProjectTaskPriority)} options={PRIORITY_OPTIONS} disabled={submitting} />
              <SelectField id="assignee" label="Assignee" value={assigneeId} onChange={setAssigneeId} options={userOptions} disabled={submitting} />
              <DatePicker id="due-date" label="Due Date" value={dueDate} onChange={setDueDate} optional disabled={submitting} />
            </div>
            <FormActions cancelLabel={t("form.cancel")} submitLabel={t("projects.saveChanges")} loading={submitting} disabled={submitting} onCancel={() => handleEditOpenChange(false)} />
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
