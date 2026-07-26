"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DatePicker } from "@/components/forms/date-picker";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { AssigneeSelect } from "@/components/crm/assignee-select";
import { ModuleLayout } from "@/components/layout/module-layout";
import { CrmNavLinks } from "@/components/crm/crm-gate";
import { CrmDetailSkeleton } from "@/components/crm/crm-page-skeleton";
import { ACTIVITY_TYPE_LABELS } from "@/components/crm/crm-columns";
import {
  CrmWorkspace,
  EntityActionBar,
  EntityAudit,
  EntityFieldGrid,
  EntityHeader,
  EntityMetrics,
  EntityNotesEditor,
  EntityOwner,
  EntityRelations,
  EntitySection,
  EntityStatus,
  EntityTitle,
  EntityWorkflow,
} from "@/components/entity-workspace";
import type { EntityAction } from "@/lib/entity-workspace";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { useCompleteActivity, useCrmActivity, useCrmLeads, useCrmOpportunities, useUpdateActivity } from "@/lib/hooks/use-crm";
import { useSalesCustomers } from "@/lib/hooks/use-sales";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/date";
import { inputClassName } from "@/lib/form-utils";
import { CRM_PERMISSIONS, type CrmActivityType, type CrmAssigneeOption } from "@ierp/shared";

const TYPE_OPTIONS = Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => ({ value, label }));

export default function ActivityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { locale, t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(CRM_PERMISSIONS.WRITE);
  const { data: activity, loading, error, refetch } = useCrmActivity(id);
  const completeMutation = useCompleteActivity();
  const updateMutation = useUpdateActivity();
  const { data: leadsData } = useCrmLeads({ page: 1 });
  const { data: opportunitiesData } = useCrmOpportunities({ page: 1 });
  const { data: customersData } = useSalesCustomers({ active: true, page: 1 });
  const [completing, setCompleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editType, setEditType] = useState<CrmActivityType>("CALL");
  const [editDueDate, setEditDueDate] = useState("");
  const [editAssignee, setEditAssignee] = useState<CrmAssigneeOption | null>(null);
  const [editLink, setEditLink] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEditDialog() {
    if (!activity) return;
    setEditSubject(activity.subject); setEditType(activity.type); setEditDueDate(activity.dueDate ?? "");
    setEditAssignee(activity.assignedTo ? { ...activity.assignedTo, isActive: true } : null);
    setEditLink(activity.lead ? `lead:${activity.lead.id}` : activity.opportunity ? `opportunity:${activity.opportunity.id}` : activity.customer ? `customer:${activity.customer.id}` : "");
    setEditError(null); setEditOpen(true);
  }

  function handleEditOpenChange(open: boolean) {
    if (!shouldAllowEditDialogClose(editSubmitting, open)) return;
    setEditOpen(open);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activity || editSubmitting || !editSubject.trim()) return;
    setEditSubmitting(true); setEditError(null);
    try {
      const [linkType, linkedId] = editLink.split(":");
      await updateMutation.mutateAsync({
        id,
        input: {
          subject: editSubject.trim(), type: editType, dueDate: editDueDate || null, assignedToId: editAssignee?.id ?? null,
          leadId: linkType === "lead" ? linkedId : null,
          opportunityId: linkType === "opportunity" ? linkedId : null,
          customerId: linkType === "customer" ? linkedId : null,
        },
        assignee: editAssignee, leadId: activity.lead?.id, opportunityId: activity.opportunity?.id,
      });
      setEditOpen(false); setActionSuccess(t("masterData.saved"));
    } catch (err) { setEditError(mapTransactionUiError(err, t("form.submitFailed"))); }
    finally { setEditSubmitting(false); }
  }

  async function handleComplete() {
    setCompleting(true);
    setActionError(null);
    try {
      await completeMutation.mutateAsync({ id });
      setActionSuccess("Activity completed");
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setCompleting(false);
    }
  }

  if (loading) return <CrmDetailSkeleton />;

  if (error || !activity) {
    return (
      <ModuleLayout maxWidth="lg">
        <CrmWorkspace
          entityType="activity"
          entityId={id}
          error={error ?? "Activity not found"}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const statusLabel = activity.isCompleted ? "Completed" : activity.isOverdue ? "Overdue" : "Open";
  const headerActions: EntityAction[] = canWrite
      ? [
          { id: "edit", label: t("entityWorkspace.action.edit"), icon: <Pencil className="h-3.5 w-3.5" aria-hidden />, kind: "primary", capability: "edit", onSelect: openEditDialog },
          ...(activity.canComplete ? [
          {
            id: "complete",
            label: t("crm.completeActivity"),
            icon: <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />,
            kind: "secondary",
            capability: "complete",
            pending: completing,
            onSelect: () => void handleComplete(),
          } satisfies EntityAction] : []),
        ]
      : [];
  const relations = [
    ...(activity.lead
      ? [{
          id: `lead-${activity.lead.id}`,
          label: `Lead: ${activity.lead.leadNumber}`,
          description: activity.lead.companyName,
          meta: activity.lead.leadNumber,
          href: `/dashboard/crm/leads/${activity.lead.id}`,
        }]
      : []),
    ...(activity.opportunity
      ? [{
          id: `opportunity-${activity.opportunity.id}`,
          label: `Opportunity: ${activity.opportunity.opportunityNumber}`,
          description: activity.opportunity.title,
          meta: activity.opportunity.opportunityNumber,
          href: `/dashboard/crm/opportunities/${activity.opportunity.id}`,
        }]
      : []),
    ...(activity.customer
      ? [{
          id: `customer-${activity.customer.id}`,
          label: `Customer: ${activity.customer.name}`,
          description: activity.customer.code,
          meta: activity.customer.code,
          href: `/dashboard/sales/customers/${activity.customer.id}`,
        }]
      : []),
  ];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/crm/activities">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            Back to activities
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={actionError} />
      <CrmNavLinks />

      <CrmWorkspace
        entityType="activity"
        entityId={activity.id}
        readOnly={!canWrite}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: "CRM", href: "/dashboard/crm" },
              { label: "Activities", href: "/dashboard/crm/activities" },
              { label: activity.subject },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <EntityTitle
                title={activity.subject}
                subtitle={ACTIVITY_TYPE_LABELS[activity.type]}
                trailing={
                  <EntityStatus
                    label={statusLabel}
                    variant={activity.isCompleted ? "success" : activity.isOverdue ? "warning" : "info"}
                  />
                }
              />
              <EntityActionBar
                actions={headerActions}
                capabilities={canWrite ? ["edit", ...(activity.canComplete ? ["complete" as const] : [])] : []}
              />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              { id: "type", label: "Type", value: ACTIVITY_TYPE_LABELS[activity.type] },
              { id: "due", label: "Due Date", value: <span className="ew-ltr-isolate">{formatDisplayDate(activity.dueDate, locale)}</span> },
              { id: "completed", label: "Completed At", value: <span className="ew-ltr-isolate">{formatDisplayDateTime(activity.completedAt, locale)}</span> },
            ]}
          />
        }
        main={
          <>
            <EntitySection id="activity-details" title="Activity Details" defaultOpen>
              <EntityFieldGrid
                fields={[
                  { id: "subject", label: "Subject", value: activity.subject, span: "lg" },
                  { id: "type", label: "Type", value: ACTIVITY_TYPE_LABELS[activity.type], span: "sm" },
                ]}
              />
            </EntitySection>
            <EntityRelations
              items={relations}
              title="Related Records"
              emptyTitle={t("entityWorkspace.noRelated")}
              emptyDescription=""
            />
            <EntityNotesEditor value={activity.notes} canEdit={canWrite} onSave={async (notes) => {
              await updateMutation.mutateAsync({ id, input: { notes }, leadId: activity.lead?.id, opportunityId: activity.opportunity?.id });
            }} />
          </>
        }
        sidebar={
          <>
            <EntityOwner
              name={activity.assignedTo?.name ?? "Unassigned"}
              role={activity.assignedTo?.role ?? activity.assignedTo?.email ?? undefined}
              defaultOpen
            />
            <EntityWorkflow statusLabel={statusLabel} defaultOpen />
          </>
        }
        footer={
          <EntityAudit
            meta={{
              id: activity.id,
              createdAt: formatDisplayDateTime(activity.createdAt, locale),
            }}
          />
        }
      />
      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{t("entityWorkspace.action.edit")} — {activity.subject}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => void handleEditSubmit(e)}>
            <ActionFeedback error={editError} />
            <FormField label="Subject" required><input className={inputClassName} value={editSubject} onChange={(e) => setEditSubject(e.target.value)} disabled={editSubmitting} /></FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField id="activity-type" label="Type" value={editType} onChange={(v) => setEditType(v as CrmActivityType)} options={TYPE_OPTIONS} disabled={editSubmitting} />
              <DatePicker id="activity-due" label="Due Date" value={editDueDate} onChange={setEditDueDate} optional disabled={editSubmitting} />
            </div>
            <SelectField
              id="activity-link"
              label="Linked record"
              value={editLink}
              onChange={setEditLink}
              options={[
                { value: "", label: "No linked record" },
                ...(leadsData?.data ?? []).map((lead) => ({ value: `lead:${lead.id}`, label: `Lead — ${lead.companyName}` })),
                ...(opportunitiesData?.data ?? []).map((opportunity) => ({ value: `opportunity:${opportunity.id}`, label: `Opportunity — ${opportunity.title}` })),
                ...(customersData?.data ?? []).map((customer) => ({ value: `customer:${customer.id}`, label: `Customer — ${customer.name}` })),
              ]}
              disabled={editSubmitting}
            />
            <AssigneeSelect id="activity-assignee" label="Assigned to" value={editAssignee?.id} initialOption={editAssignee} onChange={setEditAssignee} disabled={editSubmitting} />
            <FormActions cancelLabel={t("form.cancel")} submitLabel={t("masterData.saveChanges")} loading={editSubmitting} disabled={editSubmitting} onCancel={() => handleEditOpenChange(false)} />
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
