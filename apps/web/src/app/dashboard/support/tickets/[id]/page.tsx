"use client";

import { use, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DatePicker } from "@/components/forms/date-picker";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { ModuleLayout } from "@/components/layout/module-layout";
import { SupportNavLinks } from "@/components/support/support-gate";
import {
  EntityActionBar,
  EntityAudit,
  EntityEmptyState,
  EntityFieldGrid,
  EntityHeader,
  EntityLinkedAttachments,
  EntityMetrics,
  EntityOwner,
  EntityRelations,
  EntitySection,
  EntityStatus,
  EntityTitle,
  EntityWorkflow,
  OperationalWorkspace,
} from "@/components/entity-workspace";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_SOURCE_LABELS,
  TICKET_STATUS_LABELS,
  ticketPriorityVariant,
} from "@/components/support/support-columns";
import { SupportDetailSkeleton } from "@/components/support/support-page-skeleton";
import { RelatedKnowledgePanel } from "@/components/knowledge/related-knowledge-panel";
import type { EntityAction } from "@/lib/entity-workspace";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { formatDisplayDateTime, formatRelativeTime } from "@/lib/date";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import {
  useAddTicketComment,
  useAssignTicket,
  useSupportCategories,
  useSupportTicket,
  useUpdateSupportTicket,
  useUpdateTicketStatus,
} from "@/lib/hooks/use-support";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useProjects } from "@/lib/hooks/use-projects";
import { useSalesCustomers } from "@/lib/hooks/use-sales";
import { useSettingsUsers } from "@/lib/hooks/use-settings";
import { useI18n } from "@/lib/i18n";
import type { BadgeProps } from "@/components/ui/badge";
import {
  SUPPORT_PERMISSIONS,
  type TicketPriority,
  type TicketStatus,
} from "@ierp/shared";

const STATUS_OPTIONS = Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => ({
  value: value as TicketStatus,
  label,
}));

function statusVariant(status: TicketStatus): BadgeProps["variant"] {
  switch (status) {
    case "OPEN":
      return "info";
    case "IN_PROGRESS":
    case "RESOLVED":
      return "success";
    case "WAITING_CUSTOMER":
      return "warning";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

export default function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(SUPPORT_PERMISSIONS.WRITE);
  const { data: ticket, loading, error, refetch } = useSupportTicket(id);
  const updateStatusMutation = useUpdateTicketStatus();
  const updateTicketMutation = useUpdateSupportTicket();
  const assignMutation = useAssignTicket();
  const addCommentMutation = useAddTicketComment();
  const { data: usersData } = useSettingsUsers();
  const { data: categoriesData } = useSupportCategories({});
  const { data: customersData } = useSalesCustomers({ active: true });
  const { data: projectsData } = useProjects({});
  const [newStatus, setNewStatus] = useState("");
  const [assigneeId, setAssigneeId] = useState<string | undefined>(undefined);
  const [commentBody, setCommentBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editPriority, setEditPriority] = useState<TicketPriority>("MEDIUM");
  const [editDueAt, setEditDueAt] = useState("");
  const [editCustomerId, setEditCustomerId] = useState("");
  const [editProjectId, setEditProjectId] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEditDialog() {
    if (!ticket) return;
    setEditTitle(ticket.title);
    setEditDescription(ticket.description);
    setEditCategoryId(ticket.categoryId ?? "");
    setEditPriority(ticket.priority);
    setEditDueAt(ticket.dueAt?.slice(0, 10) ?? "");
    setEditCustomerId(ticket.customerId ?? "");
    setEditProjectId(ticket.projectId ?? "");
    setEditError(null);
    setEditOpen(true);
  }

  function handleEditOpenChange(nextOpen: boolean) {
    if (!shouldAllowEditDialogClose(editSubmitting, nextOpen)) return;
    setEditOpen(nextOpen);
    if (!nextOpen) setEditError(null);
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!ticket || !canWrite || editSubmitting || !editTitle.trim() || !editDescription.trim()) {
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateTicketMutation.mutateAsync({
        id,
        input: {
          title: editTitle.trim(),
          description: editDescription.trim(),
          categoryId: editCategoryId || null,
          priority: editPriority,
          dueAt: editDueAt || null,
          customerId: editCustomerId || null,
          projectId: editProjectId || null,
        },
      });
      setEditOpen(false);
      setActionSuccess("Ticket updated.");
    } catch (err) {
      setEditError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setEditSubmitting(false);
    }
  }

  const workflowSteps = useMemo(
    () =>
      STATUS_OPTIONS.map((option) => ({
        id: option.value,
        label: option.label,
        active: option.value === ticket?.status,
      })),
    [ticket?.status]
  );

  async function handleStatusChange() {
    if (!newStatus || !ticket || !canWrite || newStatus === ticket.status) return;
    setUpdatingStatus(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await updateStatusMutation.mutateAsync({ id, status: newStatus as TicketStatus });
      setNewStatus("");
      setActionSuccess(t("support.statusUpdated"));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleAssign() {
    if (!ticket || !canWrite || assigneeId === undefined) return;
    const nextAssigneeId = assigneeId || null;
    if (nextAssigneeId === ticket.assignedToId) return;
    setAssigning(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await assignMutation.mutateAsync({ id, assignedToId: nextAssigneeId });
      setAssigneeId(undefined);
      setActionSuccess(t("support.assignedUpdated"));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setAssigning(false);
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim() || !canWrite) return;
    setSubmittingComment(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await addCommentMutation.mutateAsync({
        id,
        body: commentBody.trim(),
        isInternal,
      });
      setCommentBody("");
      setIsInternal(false);
      setActionSuccess(t("support.commentAdded"));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setSubmittingComment(false);
    }
  }

  if (loading) return <SupportDetailSkeleton />;

  if (error || !ticket) {
    return (
      <ModuleLayout maxWidth="lg">
        <OperationalWorkspace
          entityType="support_ticket"
          entityId={id}
          error={error ?? t("support.ticketNotFound")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const userOptions = [
    { value: "", label: t("support.unassigned") },
    ...(usersData?.data ?? []).map((user) => ({ value: user.id, label: user.name })),
  ];

  const relationItems = [
    ...(ticket.customer
      ? [{
          id: "customer",
          label: ticket.customer.name,
          description: "Customer",
          meta: ticket.customer.code,
          href: `/dashboard/sales/customers/${ticket.customer.id}`,
        }]
      : []),
    ...(ticket.project
      ? [{
          id: "project",
          label: ticket.project.name,
          description: "Project",
          meta: ticket.project.code,
          href: `/dashboard/projects/${ticket.project.id}`,
        }]
      : []),
  ];

  const headerActions: EntityAction[] = canWrite
    ? [{
        id: "edit",
        label: "Edit ticket",
        icon: <Pencil className="h-3.5 w-3.5" aria-hidden />,
        kind: "primary",
        capability: "edit",
        onSelect: openEditDialog,
      }, {
        id: "add-comment",
        label: t("support.addComment"),
        icon: <MessageSquare className="h-3.5 w-3.5" aria-hidden />,
        kind: "secondary",
        capability: "comment",
        onSelect: () => document.getElementById("ticket-comment-body")?.focus(),
      }]
    : [];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/support/tickets">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("support.backToTickets")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={actionError} />
      <SupportNavLinks />

      <OperationalWorkspace
        entityType="support_ticket"
        entityId={ticket.id}
        readOnly={!canWrite}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: t("nav.group.support"), href: "/dashboard/support" },
              { label: t("nav.tickets"), href: "/dashboard/support/tickets" },
              { label: ticket.ticketNumber },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <EntityTitle
                title={ticket.title}
                subtitle={<span className="ew-ltr-isolate font-mono text-xs">{ticket.ticketNumber}</span>}
                trailing={
                  <EntityStatus
                    label={TICKET_STATUS_LABELS[ticket.status]}
                    variant={statusVariant(ticket.status)}
                  />
                }
              />
              <EntityActionBar
                actions={headerActions}
                capabilities={canWrite ? ["edit", "comment"] : []}
              />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              {
                id: "priority",
                label: t("support.priority"),
                value: (
                  <StatusBadge
                    status={ticketPriorityVariant(ticket.priority)}
                    label={TICKET_PRIORITY_LABELS[ticket.priority]}
                  />
                ),
              },
              { id: "source", label: t("support.source"), value: TICKET_SOURCE_LABELS[ticket.source] },
              {
                id: "due",
                label: t("support.dueDate"),
                value: formatDisplayDateTime(ticket.dueAt, locale),
                hint: ticket.isOverdue ? t("support.overdue") : undefined,
              },
              { id: "comments", label: t("support.comments"), value: String(ticket.comments.length) },
            ]}
          />
        }
        main={
          <>
            <EntitySection id="ticket-details" title={t("support.ticketDetails")} defaultOpen>
              <EntityFieldGrid
                fields={[
                  {
                    id: "number",
                    label: "Ticket",
                    value: ticket.ticketNumber,
                    mono: true,
                    span: "sm",
                  },
                  {
                    id: "category",
                    label: t("nav.categories"),
                    value: ticket.category?.name ?? "—",
                    span: "sm",
                  },
                  {
                    id: "opened",
                    label: "Opened",
                    value: formatDisplayDateTime(ticket.openedAt, locale),
                    span: "sm",
                  },
                  {
                    id: "resolved",
                    label: "Resolved",
                    value: formatDisplayDateTime(ticket.resolvedAt, locale),
                    span: "sm",
                  },
                  {
                    id: "closed",
                    label: "Closed",
                    value: formatDisplayDateTime(ticket.closedAt, locale),
                    span: "sm",
                  },
                  {
                    id: "description",
                    label: "Description",
                    value: ticket.description,
                    span: "full",
                  },
                ]}
              />
            </EntitySection>

            <EntityRelations
              items={relationItems}
              title="Customer & project"
              emptyTitle="No customer or project linked"
              emptyDescription=""
            />

            <EntitySection id="ticket-comments" title={t("support.comments")} defaultOpen>
              <div className="space-y-4">
                {ticket.comments.length === 0 ? (
                  <EntityEmptyState
                    variant="empty"
                    density="compact"
                    title={t("support.noComments")}
                  />
                ) : (
                  <ol className="space-y-3">
                    {ticket.comments.map((comment) => (
                      <li
                        key={comment.id}
                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background)]/40 p-4"
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-medium">
                              {comment.author?.name ?? t("support.unknownAuthor")}
                            </span>
                            {comment.isInternal ? (
                              <StatusBadge status="pending" label={t("support.internalNote")} />
                            ) : null}
                          </div>
                          <time
                            dateTime={comment.createdAt}
                            className="ew-ltr-isolate text-xs text-[var(--muted)]"
                          >
                            {formatDisplayDateTime(comment.createdAt, locale)}
                          </time>
                        </div>
                        <p className="whitespace-pre-wrap break-words text-sm text-[var(--foreground)]">
                          {comment.body}
                        </p>
                      </li>
                    ))}
                  </ol>
                )}

                {canWrite ? (
                  <form onSubmit={(e) => void handleAddComment(e)} className="space-y-4">
                    <FormField
                      label={t("support.commentBody")}
                      htmlFor="ticket-comment-body"
                      required
                    >
                      <textarea
                        id="ticket-comment-body"
                        className={cn(textareaClassName, "min-h-24")}
                        rows={4}
                        value={commentBody}
                        onChange={(e) => setCommentBody(e.target.value)}
                        disabled={submittingComment}
                        required
                      />
                    </FormField>
                    <label className="flex cursor-pointer items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        disabled={submittingComment}
                        className="cursor-pointer"
                      />
                      {t("support.internalNote")}
                    </label>
                    <div className="flex justify-end">
                      <Button
                        type="submit"
                        className="cursor-pointer"
                        loading={submittingComment}
                        loadingText={t("form.submitting")}
                        disabled={!commentBody.trim() || submittingComment}
                      >
                        {t("support.addComment")}
                      </Button>
                    </div>
                  </form>
                ) : null}
              </div>
            </EntitySection>

            <RelatedKnowledgePanel supportTicketId={id} />
            <EntityLinkedAttachments
              module="SUPPORT"
              entityType="support_ticket"
              entityId={id}
            />
          </>
        }
        sidebar={
          <>
            <EntityOwner
              name={ticket.assignedTo?.name ?? t("support.unassigned")}
              role={ticket.assignedTo?.email}
              defaultOpen
            >
              {canWrite ? (
                <div className="space-y-3">
                  <SelectField
                    id="assignee"
                    label={t("support.assignee")}
                    value={assigneeId ?? ticket.assignedToId ?? ""}
                    onChange={setAssigneeId}
                    options={userOptions}
                    disabled={assigning}
                    loading={assigning}
                    loadingLabel={t("action.assigning", "Assigning…")}
                  />
                  <Button
                    type="button"
                    className="w-full cursor-pointer"
                    loading={assigning}
                    loadingText={t("action.assigning", "Assigning…")}
                    disabled={
                      assigning ||
                      assigneeId === undefined ||
                      (assigneeId || null) === ticket.assignedToId
                    }
                    onClick={() => void handleAssign()}
                  >
                    {t("support.assignTicket")}
                  </Button>
                </div>
              ) : null}
            </EntityOwner>

            <EntityWorkflow
              statusLabel={TICKET_STATUS_LABELS[ticket.status]}
              steps={workflowSteps}
              defaultOpen
              actions={
                canWrite ? (
                  <div className="flex w-full flex-col gap-3">
                    <SelectField
                      id="ticketStatus"
                      label={t("support.status")}
                      value={newStatus || ticket.status}
                      onChange={setNewStatus}
                      options={STATUS_OPTIONS}
                      disabled={updatingStatus}
                      loading={updatingStatus}
                      loadingLabel={t("action.updating", "Updating…")}
                    />
                    <Button
                      type="button"
                      className="cursor-pointer"
                      loading={updatingStatus}
                      loadingText={t("action.updating", "Updating…")}
                      disabled={
                        updatingStatus || !newStatus || newStatus === ticket.status
                      }
                      onClick={() => void handleStatusChange()}
                    >
                      {t("support.changeStatus")}
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
              id: ticket.id,
              createdAt: formatRelativeTime(ticket.createdAt, locale),
              updatedAt: formatRelativeTime(ticket.updatedAt, locale),
            }}
          />
        }
      />

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit ticket</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleEditSubmit(e)} className="space-y-4">
            <ActionFeedback error={editError} />
            <FormField label={t("support.ticketTitle")} htmlFor="edit-ticket-title" required>
              <input
                id="edit-ticket-title"
                className={inputClassName}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={editSubmitting}
                required
              />
            </FormField>
            <FormField
              label={t("support.ticketDescription")}
              htmlFor="edit-ticket-description"
              required
            >
              <textarea
                id="edit-ticket-description"
                className={cn(textareaClassName, "min-h-28")}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={editSubmitting}
                required
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="edit-ticket-priority"
                label={t("support.priority")}
                value={editPriority}
                onChange={(value) => setEditPriority(value as TicketPriority)}
                options={Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => ({
                  value,
                  label,
                }))}
                disabled={editSubmitting}
              />
              <SelectField
                id="edit-ticket-category"
                label={t("nav.categories")}
                value={editCategoryId}
                onChange={setEditCategoryId}
                options={[
                  { value: "", label: t("support.noCategory") },
                  ...(categoriesData?.data ?? []).map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
                disabled={editSubmitting}
              />
              <SelectField
                id="edit-ticket-customer"
                label={t("support.customer")}
                value={editCustomerId}
                onChange={setEditCustomerId}
                options={[
                  { value: "", label: t("support.noCustomer") },
                  ...(customersData?.data ?? []).map((customer) => ({
                    value: customer.id,
                    label: `${customer.code} — ${customer.name}`,
                  })),
                ]}
                disabled={editSubmitting}
              />
              <SelectField
                id="edit-ticket-project"
                label="Project"
                value={editProjectId}
                onChange={setEditProjectId}
                options={[
                  { value: "", label: t("support.noProject") },
                  ...(projectsData?.data ?? []).map((project) => ({
                    value: project.id,
                    label: `${project.code} — ${project.name}`,
                  })),
                ]}
                disabled={editSubmitting}
              />
              <DatePicker
                id="edit-ticket-due"
                label={t("support.dueDate")}
                value={editDueAt}
                onChange={setEditDueAt}
                optional
                disabled={editSubmitting}
              />
            </div>
            <FormActions
              cancelLabel={t("form.cancel")}
              submitLabel={t("common.save")}
              loading={editSubmitting}
              disabled={
                editSubmitting || !editTitle.trim() || !editDescription.trim()
              }
              onCancel={() => handleEditOpenChange(false)}
            />
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
