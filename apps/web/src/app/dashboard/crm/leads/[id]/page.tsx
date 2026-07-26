"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DataTable } from "@/components/data-display/data-table";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { AssigneeSelect } from "@/components/crm/assignee-select";
import { ModuleLayout } from "@/components/layout/module-layout";
import { CrmNavLinks } from "@/components/crm/crm-gate";
import { CrmDetailSkeleton } from "@/components/crm/crm-page-skeleton";
import { activityColumns, LEAD_SOURCE_LABELS } from "@/components/crm/crm-columns";
import {
  CrmWorkspace,
  EntityActionBar,
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
  EntityTitle,
  EntityWorkflow,
} from "@/components/entity-workspace";
import type { EntityAction } from "@/lib/entity-workspace";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { useCrmLead, useUpdateLead, useUpdateLeadStatus } from "@/lib/hooks/use-crm";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { formatDisplayDateTime } from "@/lib/date";
import { inputClassName } from "@/lib/form-utils";
import type { BadgeProps } from "@/components/ui/badge";
import { CRM_PERMISSIONS, type CrmAssigneeOption, type LeadSource, type LeadStatus } from "@ierp/shared";

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "QUALIFIED", label: "Qualified" },
  { value: "LOST", label: "Lost" },
  { value: "CONVERTED", label: "Converted" },
];
const SOURCE_OPTIONS = Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => ({ value, label }));

function statusVariant(status: LeadStatus): BadgeProps["variant"] {
  if (status === "QUALIFIED" || status === "CONVERTED") return "success";
  if (status === "LOST") return "destructive";
  if (status === "CONTACTED") return "info";
  return "secondary";
}

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { locale, t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(CRM_PERMISSIONS.WRITE);
  const { data: lead, loading, error, refetch } = useCrmLead(id);
  const statusMutation = useUpdateLeadStatus();
  const updateMutation = useUpdateLead();
  const [newStatus, setNewStatus] = useState("");
  const [updating, setUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editCompany, setEditCompany] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editSource, setEditSource] = useState<LeadSource>("OTHER");
  const [editValue, setEditValue] = useState("");
  const [editAssignee, setEditAssignee] = useState<CrmAssigneeOption | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEditDialog() {
    if (!lead) return;
    setEditCompany(lead.companyName); setEditContact(lead.contactName);
    setEditEmail(lead.email ?? ""); setEditPhone(lead.phone ?? ""); setEditCity(lead.city);
    setEditSource(lead.source); setEditValue(lead.estimatedValue.replace(/[^\d.]/g, ""));
    setEditAssignee(lead.assignedTo ? { ...lead.assignedTo, isActive: true } : null);
    setEditError(null); setEditOpen(true);
  }

  function handleEditOpenChange(open: boolean) {
    if (!shouldAllowEditDialogClose(editSubmitting, open)) return;
    setEditOpen(open);
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lead || editSubmitting) return;
    const estimatedValue = Number(editValue);
    if (!editCompany.trim() || !editContact.trim() || !editCity.trim() || !Number.isFinite(estimatedValue) || estimatedValue < 0) {
      setEditError(t("form.validationError", "Check the entered values.")); return;
    }
    setEditSubmitting(true); setEditError(null);
    try {
      await updateMutation.mutateAsync({ id, input: {
        companyName: editCompany.trim(), contactName: editContact.trim(), email: editEmail.trim() || null,
        phone: editPhone.trim() || null, city: editCity.trim(), source: editSource, estimatedValue,
        assignedToId: editAssignee?.id ?? null,
      }, assignee: editAssignee });
      setEditOpen(false); setActionSuccess(t("masterData.saved"));
    } catch (err) { setEditError(mapTransactionUiError(err, t("form.submitFailed"))); }
    finally { setEditSubmitting(false); }
  }

  async function handleStatusChange() {
    if (!newStatus || !lead) return;
    setUpdating(true);
    setActionError(null);
    try {
      await statusMutation.mutateAsync({ id, status: newStatus as LeadStatus });
      setActionSuccess("Status updated");
      setNewStatus("");
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setUpdating(false);
    }
  }

  if (loading) return <CrmDetailSkeleton />;

  if (error || !lead) {
    return (
      <ModuleLayout maxWidth="lg">
        <CrmWorkspace
          entityType="lead"
          entityId={id}
          error={error ?? "Lead not found"}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const headerActions: EntityAction[] = canWrite
    ? [
        { id: "edit", label: t("entityWorkspace.action.edit"), icon: <Pencil className="h-3.5 w-3.5" aria-hidden />, kind: "primary", capability: "edit", onSelect: openEditDialog },
        {
          id: "new-opportunity",
          label: t("crm.newOpportunity"),
          icon: <Plus className="h-3.5 w-3.5" aria-hidden />,
          kind: "secondary",
          capability: "create",
          onSelect: () => window.location.assign("/dashboard/crm/opportunities/new"),
        },
      ]
    : [];

  const opportunityRelations = lead.opportunities.map((opp) => ({
    id: opp.id,
    label: `${opp.opportunityNumber} — ${opp.title}`,
    description: [opp.stage?.replace(/_/g, " "), opp.estimatedValue].filter(Boolean).join(" · "),
    meta: opp.opportunityNumber,
    href: `/dashboard/crm/opportunities/${opp.id}`,
  }));

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/crm/leads">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            Back to leads
          </Link>
        </Button>
      </div>

      <ActionFeedback success={actionSuccess} error={actionError} />
      <CrmNavLinks />

      <CrmWorkspace
        entityType="lead"
        entityId={lead.id}
        readOnly={!canWrite}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: "CRM", href: "/dashboard/crm" },
              { label: "Leads", href: "/dashboard/crm/leads" },
              { label: lead.leadNumber },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <EntityTitle
                title={lead.companyName}
                subtitle={
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="ew-ltr-isolate font-mono text-xs">{lead.leadNumber}</span>
                    <span>· {lead.contactName}</span>
                  </span>
                }
                trailing={<EntityStatus label={lead.status} variant={statusVariant(lead.status)} />}
              />
              <EntityActionBar actions={headerActions} capabilities={canWrite ? ["edit", "create"] : []} />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              { id: "value", label: "Est. Value", value: lead.estimatedValue },
              { id: "activities", label: "Activities", value: String(lead.activities.length) },
              { id: "opportunities", label: "Opportunities", value: String(lead.opportunities.length) },
            ]}
          />
        }
        main={
          <>
            <EntitySection id="contact" title="Company & Contact" defaultOpen>
              <EntityFieldGrid
                fields={[
                  { id: "company", label: "Company", value: lead.companyName, span: "md" },
                  { id: "contact", label: "Contact", value: lead.contactName, span: "md" },
                  { id: "city", label: "City", value: lead.city, span: "sm" },
                  { id: "source", label: "Source", value: LEAD_SOURCE_LABELS[lead.source], span: "sm" },
                  { id: "email", label: "Email", value: lead.email ?? "—", span: "md" },
                  { id: "phone", label: "Phone", value: lead.phone ?? "—", span: "md" },
                ]}
              />
            </EntitySection>

            {lead.convertedCustomer ? (
              <EntityRelations
                title={t("crm.convertedCustomer")}
                items={[
                  {
                    id: lead.convertedCustomer.id,
                    label: lead.convertedCustomer.name,
                    description: lead.convertedCustomer.code,
                    meta: lead.convertedCustomer.code,
                    href: `/dashboard/sales/customers/${lead.convertedCustomer.id}`,
                  },
                ]}
              />
            ) : null}

            <EntityRelations
              title={t("crm.relatedOpportunities")}
              items={opportunityRelations}
              emptyTitle={t("crm.noOpportunities")}
              emptyDescription=""
            />

            <EntityNotesEditor value={lead.notes} canEdit={canWrite} onSave={async (notes) => {
              await updateMutation.mutateAsync({ id, input: { notes } });
            }} />

            <EntityTableSection id="related-activities" title="Related Activities">
              {lead.activities.length ? (
                <DataTable columns={activityColumns} data={lead.activities} pageSize={10} />
              ) : (
                <div className="p-4"><EntityEmptyState variant="empty" title={t("common.noData")} /></div>
              )}
            </EntityTableSection>
          </>
        }
        sidebar={
          <>
            <EntityOwner
              name={lead.assignedTo?.name ?? "Unassigned"}
              role={lead.assignedTo?.role ?? lead.assignedTo?.email ?? undefined}
              defaultOpen
            />
            <EntityWorkflow
              statusLabel={lead.status.replace(/_/g, " ")}
              defaultOpen
              actions={
                lead.canChangeStatus && canWrite ? (
                  <div className="flex w-full flex-col gap-3">
                    <SelectField
                      id="leadStatus"
                      label="Status"
                      value={newStatus || lead.status}
                      onChange={setNewStatus}
                      options={STATUS_OPTIONS}
                      disabled={updating}
                      loading={updating}
                      loadingLabel={t("action.updating", "Updating…")}
                    />
                    <Button
                      type="button"
                      loading={updating}
                      loadingText={t("action.updating", "Updating…")}
                      disabled={updating || !newStatus || newStatus === lead.status}
                      onClick={() => void handleStatusChange()}
                    >
                      {t("crm.changeStatus")}
                    </Button>
                  </div>
                ) : undefined
              }
            />
          </>
        }
        footer={<EntityAudit meta={{ id: lead.id, createdAt: formatDisplayDateTime(lead.createdAt, locale) }} />}
      />
      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{t("entityWorkspace.action.edit")} — {lead.companyName}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => void handleEditSubmit(e)}>
            <ActionFeedback error={editError} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Company" required><input className={inputClassName} value={editCompany} onChange={(e) => setEditCompany(e.target.value)} disabled={editSubmitting} /></FormField>
              <FormField label="Contact" required><input className={inputClassName} value={editContact} onChange={(e) => setEditContact(e.target.value)} disabled={editSubmitting} /></FormField>
              <FormField label="Email"><input type="email" className={inputClassName} value={editEmail} onChange={(e) => setEditEmail(e.target.value)} disabled={editSubmitting} /></FormField>
              <FormField label="Phone"><input className={inputClassName} value={editPhone} onChange={(e) => setEditPhone(e.target.value)} disabled={editSubmitting} /></FormField>
              <FormField label="City" required><input className={inputClassName} value={editCity} onChange={(e) => setEditCity(e.target.value)} disabled={editSubmitting} /></FormField>
              <SelectField id="lead-source" label="Source" value={editSource} onChange={(v) => setEditSource(v as LeadSource)} options={SOURCE_OPTIONS} disabled={editSubmitting} />
              <FormField label="Estimated value" required><input type="number" min={0} step="0.01" className={inputClassName} value={editValue} onChange={(e) => setEditValue(e.target.value)} disabled={editSubmitting} /></FormField>
            </div>
            <AssigneeSelect id="lead-assignee" label="Assigned to" value={editAssignee?.id} initialOption={editAssignee} onChange={setEditAssignee} disabled={editSubmitting} />
            <FormActions cancelLabel={t("form.cancel")} submitLabel={t("masterData.saveChanges")} loading={editSubmitting} disabled={editSubmitting} onCancel={() => handleEditOpenChange(false)} />
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
