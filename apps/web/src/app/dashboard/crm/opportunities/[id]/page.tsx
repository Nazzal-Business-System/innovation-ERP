"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DataTable } from "@/components/data-display/data-table";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DatePicker } from "@/components/forms/date-picker";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { ModuleLayout } from "@/components/layout/module-layout";
import { CrmNavLinks } from "@/components/crm/crm-gate";
import { CrmDetailSkeleton } from "@/components/crm/crm-page-skeleton";
import { AssigneeSelect } from "@/components/crm/assignee-select";
import { activityColumns } from "@/components/crm/crm-columns";
import {
  CrmWorkspace,
  EntityActionBar,
  EntityAttachments,
  EntityAudit,
  EntityEmptyState,
  EntityFieldGrid,
  EntityHeader,
  EntityMetrics,
  EntityNotesEditor,
  EntityOwner,
  EntityRelations,
  EntitySection,
  EntityStatus,
  EntityTableSection,
  EntityTimeline,
  EntityTitle,
  EntityWorkflow,
} from "@/components/entity-workspace";
import type { EntityAction } from "@/lib/entity-workspace";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import {
  buildOpportunityUpdateInput,
  opportunityEditHasChanges,
  parseMoneyInput,
} from "@/lib/crm/opportunity-edit";
import { useCrmOpportunity, useUpdateOpportunity, useUpdateOpportunityStage } from "@/lib/hooks/use-crm";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { formatDisplayDate, formatRelativeTime } from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import type { BadgeProps } from "@/components/ui/badge";
import type { CrmAssigneeOption, CrmOpportunityDetail, OpportunityStage } from "@ierp/shared";

const STAGE_OPTIONS: { value: OpportunityStage; label: string }[] = [
  { value: "PROSPECTING", label: "Prospecting" },
  { value: "QUALIFICATION", label: "Qualification" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
];

const STAGE_ORDER: OpportunityStage[] = [
  "PROSPECTING",
  "QUALIFICATION",
  "PROPOSAL",
  "NEGOTIATION",
  "WON",
  "LOST",
];

function stageLabel(stage: OpportunityStage): string {
  return stage.replace(/_/g, " ");
}

function stageBadgeVariant(stage: OpportunityStage): BadgeProps["variant"] {
  switch (stage) {
    case "WON":
      return "success";
    case "LOST":
      return "destructive";
    case "NEGOTIATION":
    case "PROPOSAL":
      return "info";
    default:
      return "secondary";
  }
}

function daysOpenFrom(createdAt: string): number {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return 0;
  return Math.max(0, Math.floor((Date.now() - created) / 86_400_000));
}

export default function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { data: opp, loading, error, refetch } = useCrmOpportunity(id);
  const stageMutation = useUpdateOpportunityStage();
  const updateMutation = useUpdateOpportunity();

  const [newStage, setNewStage] = useState("");
  const [stageUpdating, setStageUpdating] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editAssignee, setEditAssignee] = useState<CrmAssigneeOption | null>(null);
  const [editStage, setEditStage] = useState<OpportunityStage>("PROSPECTING");
  const [editValue, setEditValue] = useState("");
  const [editProbability, setEditProbability] = useState("");
  const [editCloseDate, setEditCloseDate] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  /** Snapshot at dialog open — used for dirty detection; not refreshed on cache patches. */
  const [editBaseline, setEditBaseline] = useState<CrmOpportunityDetail | null>(null);

  function seedEditForm(opportunity: CrmOpportunityDetail) {
    setEditBaseline(opportunity);
    setEditTitle(opportunity.title);
    setEditAssignee(opportunity.assignedTo ? { ...opportunity.assignedTo, isActive: true } : null);
    setEditStage(opportunity.stage);
    setEditValue(opportunity.estimatedValue.replace(/[^\d.]/g, ""));
    setEditProbability(String(opportunity.probability));
    setEditCloseDate(opportunity.expectedCloseDate ?? "");
    setEditNotes(opportunity.notes ?? "");
    setEditErrors({});
    setEditError(null);
  }

  function openEditDialog() {
    if (!opp) return;
    seedEditForm(opp);
    setEditOpen(true);
  }

  function handleEditOpenChange(open: boolean) {
    if (editSubmitting) return;
    setEditOpen(open);
    if (!open) {
      setEditBaseline(null);
      setEditErrors({});
      setEditError(null);
    }
  }

  const timelineEvents = useMemo(() => {
    if (!opp) return [];
    return [...opp.timeline]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((event) => ({
        id: event.id,
        title: event.summary,
        description: event.details ?? undefined,
        at: formatRelativeTime(event.createdAt, locale),
        actor: event.actor?.name ?? undefined,
      }));
  }, [opp, locale]);

  const workflowSteps = useMemo(() => {
    if (!opp) return [];
    const currentIdx = STAGE_ORDER.indexOf(opp.stage);
    return STAGE_OPTIONS.filter((s) => s.value !== "LOST" || opp.stage === "LOST").map((s) => {
      const idx = STAGE_ORDER.indexOf(s.value);
      return {
        id: s.value,
        label: s.label,
        active: s.value === opp.stage,
        done: currentIdx >= 0 && idx >= 0 && idx < currentIdx && opp.stage !== "LOST",
      };
    });
  }, [opp]);

  async function handleStageChange() {
    if (!newStage || !opp) return;
    if (newStage === opp.stage) return;
    setStageUpdating(true);
    setActionError(null);
    try {
      await stageMutation.mutateAsync({ id, stage: newStage as OpportunityStage });
      setActionSuccess(t("crm.stageUpdated"));
      setNewStage("");
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setStageUpdating(false);
    }
  }

  async function handleReassign(option: CrmAssigneeOption | null) {
    if (!opp || !option || option.id === opp.assignedTo?.id) return;
    setReassigning(true);
    setActionError(null);
    try {
      await updateMutation.mutateAsync({
        id,
        input: { assignedToId: option.id },
        assignee: option,
      });
      setActionSuccess(t("crm.ownerUpdated"));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setReassigning(false);
    }
  }

  async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!opp || !editBaseline || editSubmitting) return;

    const baselineValue = parseMoneyInput(editBaseline.estimatedValue) ?? 0;

    const built = buildOpportunityUpdateInput(
      {
        title: editBaseline.title,
        assignedToId: editBaseline.assignedTo?.id,
        stage: editBaseline.stage,
        estimatedValue: baselineValue,
        probability: editBaseline.probability,
        expectedCloseDate: editBaseline.expectedCloseDate,
        notes: editBaseline.notes,
      },
      {
        title: editTitle,
        assignedToId: editAssignee?.id,
        stage: editStage,
        estimatedValue: editValue,
        probability: editProbability,
        expectedCloseDate: editCloseDate,
        notes: editNotes,
      },
      {
        titleRequired: t("crm.titleRequired"),
        assigneeRequired: t("crm.assigneeRequired"),
        valueInvalid: t("crm.valueInvalid"),
        probabilityInvalid: t("crm.probabilityInvalid"),
      }
    );

    if (!built.ok) {
      setEditErrors(built.errors as Record<string, string>);
      setEditError(null);
      return;
    }

    if (!opportunityEditHasChanges(built.input)) {
      setEditErrors({});
      setEditError(t("crm.noEditChanges"));
      return;
    }

    setEditSubmitting(true);
    setEditError(null);
    setEditErrors({});
    try {
      await updateMutation.mutateAsync({
        id,
        input: built.input,
        assignee:
          built.input.assignedToId !== undefined
            ? editAssignee
            : undefined,
      });
      setEditOpen(false);
      setEditBaseline(null);
      setActionSuccess(t("crm.opportunityUpdated"));
    } catch (err) {
      setEditError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setEditSubmitting(false);
    }
  }

  if (loading) return <CrmDetailSkeleton />;

  if (error || !opp) {
    return (
      <ModuleLayout maxWidth="lg">
        <EntityEmptyState
          variant="error"
          title={t("crm.opportunityNotFound")}
          description={mapTransactionUiError(
            error ? new Error(error) : null,
            t("crm.opportunityUnavailable", "The opportunity is unavailable.")
          )}
          actionLabel={t("common.retry")}
          onAction={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const partnerSubtitle = opp.lead
    ? `${opp.lead.leadNumber} — ${opp.lead.companyName}`
    : opp.customer
      ? `${opp.customer.code} — ${opp.customer.name}`
      : undefined;

  const headerActions: EntityAction[] = [];
  if (opp.canEdit) {
    headerActions.push({
      id: "edit",
      label: t("crm.editOpportunity"),
      kind: "primary",
      capability: "edit",
      icon: <Pencil className="h-3.5 w-3.5" aria-hidden />,
      onSelect: () => openEditDialog(),
    });
  }

  const relationItems = [
    ...(opp.lead
      ? [
          {
            id: `lead-${opp.lead.id}`,
            label: t("crm.sourceLead"),
            description: `${opp.lead.leadNumber} — ${opp.lead.companyName}`,
            meta: opp.lead.leadNumber,
            href: `/dashboard/crm/leads/${opp.lead.id}`,
          },
        ]
      : []),
    ...(opp.customer
      ? [
          {
            id: `customer-${opp.customer.id}`,
            label: t("crm.sourceCustomer"),
            description: `${opp.customer.code} — ${opp.customer.name}`,
            meta: opp.customer.code,
            href: `/dashboard/sales/customers/${opp.customer.id}`,
          },
        ]
      : []),
  ];

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/crm/opportunities">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("crm.backToOpportunities")}
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={actionError} />
      <CrmNavLinks />

      <CrmWorkspace
        entityType="opportunity"
        entityId={opp.id}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: t("crm.dealWorkspace"), href: "/dashboard/crm" },
              { label: t("nav.opportunities"), href: "/dashboard/crm/opportunities" },
              { label: opp.opportunityNumber },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={opp.title}
                  subtitle={
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="ew-ltr-isolate font-mono text-xs">{opp.opportunityNumber}</span>
                      {partnerSubtitle ? <span>· {partnerSubtitle}</span> : null}
                    </span>
                  }
                  trailing={
                    <EntityStatus
                      label={stageLabel(opp.stage)}
                      variant={stageBadgeVariant(opp.stage)}
                    />
                  }
                />
              </div>
              <EntityActionBar
                actions={headerActions}
                capabilities={opp.canEdit ? ["edit"] : []}
              />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              { id: "value", label: t("crm.value"), value: opp.estimatedValue },
              { id: "weighted", label: t("crm.weightedValue"), value: opp.weightedValue },
              { id: "prob", label: t("crm.probability"), value: `${opp.probability}%` },
              {
                id: "close",
                label: t("crm.expectedClose"),
                value: (
                  <span className="ew-ltr-isolate">
                    {opp.expectedCloseDate
                      ? formatDisplayDate(opp.expectedCloseDate, locale)
                      : "—"}
                  </span>
                ),
              },
              {
                id: "days",
                label: t("crm.daysOpen"),
                value: String(daysOpenFrom(opp.createdAt)),
              },
            ]}
          />
        }
        main={
          <>
            <EntitySection id="deal-info" title={t("crm.dealDetails")} defaultOpen>
              <EntityFieldGrid
                fields={[
                  {
                    id: "number",
                    label: t("crm.opportunityNumber"),
                    value: opp.opportunityNumber,
                    mono: true,
                    span: "sm",
                  },
                  {
                    id: "stage",
                    label: t("crm.stage"),
                    value: stageLabel(opp.stage),
                    span: "sm",
                  },
                  {
                    id: "title",
                    label: t("crm.opportunityTitle"),
                    value: opp.title,
                    span: "lg",
                  },
                ]}
              />
            </EntitySection>

            <EntityRelations
              items={relationItems}
              title={t("crm.dealSource")}
              emptyTitle={t("crm.sourceEmpty")}
              emptyDescription=""
            />

            <EntityNotesEditor
              value={opp.notes}
              canEdit={Boolean(opp.canEdit)}
              onSave={async (notes) => {
                await updateMutation.mutateAsync({ id, input: { notes } });
                setActionSuccess(t("crm.notesSaved"));
              }}
            />

            <EntityTableSection
              id="related-activities"
              title={t("crm.relatedActivities")}
            >
              {opp.activities.length === 0 ? (
                <div className="p-4">
                  <EntityEmptyState variant="empty" title={t("common.noData")} />
                </div>
              ) : (
                <DataTable columns={activityColumns} data={opp.activities} pageSize={10} />
              )}
            </EntityTableSection>

            <EntityTimeline events={timelineEvents} title={t("crm.timeline")} />

            <EntityAttachments
              empty
              title={t("crm.attachments")}
              description={t("crm.attachmentsSoon")}
            />
          </>
        }
        sidebar={
          <>
            <EntityOwner
              name={opp.assignedTo?.name ?? t("crm.unassigned")}
              role={opp.assignedTo?.role ?? opp.assignedTo?.email ?? undefined}
              defaultOpen
            >
              {opp.canEdit ? (
                <AssigneeSelect
                  id="opp-reassign"
                  value={opp.assignedTo?.id}
                  initialOption={opp.assignedTo ? { ...opp.assignedTo, isActive: true } : null}
                  onChange={(next) => void handleReassign(next)}
                  disabled={reassigning}
                  pending={reassigning}
                  pendingLabel={t("action.assigning", "Assigning…")}
                  required
                />
              ) : null}
            </EntityOwner>

            <EntityWorkflow
              statusLabel={stageLabel(opp.stage)}
              steps={workflowSteps}
              defaultOpen
              actions={
                opp.canChangeStage ? (
                  <div className="flex w-full flex-col gap-3">
                    <SelectField
                      id="oppStage"
                      label={t("crm.stage")}
                      value={newStage || opp.stage}
                      onChange={setNewStage}
                      options={STAGE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                      disabled={stageUpdating}
                      loading={stageUpdating}
                      loadingLabel={t("action.updating", "Updating…")}
                    />
                    <Button
                      type="button"
                      className="cursor-pointer"
                      loading={stageUpdating}
                      loadingText={t("action.updating", "Updating…")}
                      disabled={
                        stageUpdating || !newStage || newStage === opp.stage
                      }
                      onClick={() => void handleStageChange()}
                    >
                      {t("crm.changeStage")}
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
              id: opp.id,
              createdAt: formatRelativeTime(opp.createdAt, locale),
              updatedAt: opp.updatedAt
                ? formatRelativeTime(opp.updatedAt, locale)
                : undefined,
            }}
          />
        }
      />

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("crm.editOpportunity")}</DialogTitle>
          </DialogHeader>
          <form
            id="opportunity-edit-form"
            onSubmit={(e) => void handleEditSubmit(e)}
            className="space-y-4"
            noValidate
          >
            <ActionFeedback error={editError} />

            <FormField label={t("crm.opportunityTitle")} htmlFor="edit-opp-title" required error={editErrors.title}>
              <input
                id="edit-opp-title"
                name="title"
                className={inputClassName}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                required
                disabled={editSubmitting}
              />
            </FormField>

            <AssigneeSelect
              id="edit-opp-assignee"
              label={t("crm.assignedTo")}
              value={editAssignee?.id}
              initialOption={editAssignee}
              onChange={setEditAssignee}
              error={editErrors.assignee}
              required
              disabled={editSubmitting}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="edit-opp-stage"
                label={t("crm.stage")}
                value={editStage}
                onChange={(v) => setEditStage(v as OpportunityStage)}
                options={STAGE_OPTIONS}
                disabled={editSubmitting || editBaseline?.stage === "WON" || editBaseline?.stage === "LOST"}
              />
              <FormField
                label={t("crm.estimatedValue")}
                htmlFor="edit-opp-value"
                required
                error={editErrors.estimatedValue}
              >
                <input
                  id="edit-opp-value"
                  name="estimatedValue"
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClassName}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
              <FormField
                label={t("crm.probability")}
                htmlFor="edit-opp-prob"
                required
                error={editErrors.probability}
              >
                <input
                  id="edit-opp-prob"
                  name="probability"
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  className={inputClassName}
                  value={editProbability}
                  onChange={(e) => setEditProbability(e.target.value)}
                  required
                  disabled={editSubmitting}
                />
              </FormField>
              <DatePicker
                id="edit-opp-close-date"
                label={t("crm.expectedCloseDate")}
                value={editCloseDate}
                onChange={setEditCloseDate}
                optional
                disabled={editSubmitting}
              />
            </div>

            <FormField label={t("crm.notes")} htmlFor="edit-opp-notes">
              <textarea
                id="edit-opp-notes"
                name="notes"
                className={textareaClassName}
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                disabled={editSubmitting}
              />
            </FormField>

            <FormActions
              cancelLabel={t("form.cancel")}
              submitLabel={t("crm.saveChanges")}
              loading={editSubmitting}
              disabled={editSubmitting}
              onCancel={() => handleEditOpenChange(false)}
            />
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
