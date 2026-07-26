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
import { HrNavLinks } from "@/components/hr/hr-gate";
import { HrDetailSkeleton } from "@/components/hr/hr-page-skeleton";
import {
  EntityAudit,
  EntityActionBar,
  EntityFieldGrid,
  EntityHeader,
  EntityLinkedAttachments,
  EntityMetrics,
  EntityNotesEditor,
  EntityOwner,
  EntityRelations,
  EntitySection,
  EntityStatus,
  EntityTitle,
  EntityWorkflow,
  HrWorkspace,
} from "@/components/entity-workspace";
import {
  buildLinearWorkflowSteps,
  statusLabel,
  transactionStatusVariant,
} from "@/lib/entity-workspace/transaction-status";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { useHrDocument, useUpdateHrDocument } from "@/lib/hooks/use-hr";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { formatDisplayDate } from "@/lib/date";
import { inputClassName } from "@/lib/form-utils";
import {
  getDocumentExpiryWarningLabel,
} from "@/lib/hr/document-expiry";
import type { EntityAction } from "@/lib/entity-workspace";
import type { BadgeProps } from "@/components/ui/badge";
import { HR_PERMISSIONS, type DocumentStatus } from "@ierp/shared";
import { ExpiryWarningBadge } from "@/components/hr/hr-status-badge";

const DOCUMENT_STATUS_OPTIONS: Array<{ value: DocumentStatus; label: string }> = [
  { value: "PENDING_REVIEW", label: "Pending review" }, { value: "VALID", label: "Valid" },
  { value: "EXPIRED", label: "Expired" }, { value: "MISSING", label: "Missing" },
];

const DOCUMENT_WORKFLOW = [
  { id: "PENDING_REVIEW", label: "Pending review" },
  { id: "VALID", label: "Valid" },
];

function documentStatusVariant(status: DocumentStatus): BadgeProps["variant"] {
  switch (status) {
    case "VALID":
      return "success";
    case "EXPIRED":
      return "destructive";
    case "MISSING":
      return "warning";
    case "PENDING_REVIEW":
      return "info";
    default:
      return transactionStatusVariant(status);
  }
}

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { locale, t } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(HR_PERMISSIONS.WRITE);
  const { data: doc, loading, error, refetch } = useHrDocument(id);
  const updateMutation = useUpdateHrDocument();
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("");
  const [editExpiry, setEditExpiry] = useState("");
  const [editStatus, setEditStatus] = useState<DocumentStatus>("PENDING_REVIEW");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  function openEditDialog() {
    if (!doc) return;
    setEditTitle(doc.title);
    setEditType(doc.documentType);
    setEditExpiry(doc.expiryDate ?? "");
    setEditStatus(doc.status);
    setEditError(null);
    setEditOpen(true);
  }
  function handleEditOpenChange(open: boolean) {
    if (!shouldAllowEditDialogClose(editSubmitting, open)) return;
    setEditOpen(open);
  }
  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!doc || editSubmitting || !editTitle.trim() || !editType.trim()) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateMutation.mutateAsync({
        id,
        input: {
          title: editTitle.trim(),
          documentType: editType.trim(),
          expiryDate: editExpiry || null,
          status: editStatus,
        },
      });
      setEditOpen(false);
      setActionSuccess(t("masterData.saved"));
    } catch (err) {
      setEditError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setEditSubmitting(false);
    }
  }

  if (loading) {
    return (
      <ModuleLayout>
        <HrDetailSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !doc) {
    return (
      <ModuleLayout maxWidth="lg">
        <HrWorkspace
          entityType="employee_document"
          entityId={id}
          error={error ?? t("hr.documentNotFound", "Document not found")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const workflowSteps =
    doc.status === "EXPIRED" || doc.status === "MISSING"
      ? [
          { id: "PENDING_REVIEW", label: "Pending review", done: true },
          {
            id: doc.status,
            label: t(`hr.documentStatus.${doc.status}`, statusLabel(doc.status)),
            active: true,
          },
        ]
      : buildLinearWorkflowSteps(
          DOCUMENT_WORKFLOW,
          doc.status === "VALID" ? "VALID" : "PENDING_REVIEW"
        );
  const headerActions: EntityAction[] = canWrite ? [{
    id: "edit", label: t("entityWorkspace.action.edit"), icon: <Pencil className="h-3.5 w-3.5" aria-hidden />,
    kind: "primary", capability: "edit", onSelect: openEditDialog,
  }] : [];
  const expiryWarning = getDocumentExpiryWarningLabel(doc);

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/hr/documents">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("hr.backToDocuments", "Back to documents")}
          </Link>
        </Button>
      </div>

      <HrNavLinks />
      <ActionFeedback success={actionSuccess} />

      <HrWorkspace
        entityType="employee_document"
        entityId={doc.id}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: t("hr.documentsTitle"), href: "/dashboard/hr/documents" },
              { label: doc.title },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <EntityTitle
                  title={doc.title}
                  subtitle={`${doc.documentType} · ${doc.employee.fullName}`}
                  trailing={
                    <EntityStatus
                      label={t(`hr.documentStatus.${doc.status}`, statusLabel(doc.status))}
                      variant={documentStatusVariant(doc.status)}
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
              { id: "type", label: t("hr.documentType"), value: doc.documentType },
              {
                id: "expiry",
                label: t("hr.expiryDate"),
                value: (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    <span className="ew-ltr-isolate">{formatDisplayDate(doc.expiryDate, locale)}</span>
                    {expiryWarning ? <ExpiryWarningBadge label={expiryWarning} /> : null}
                  </span>
                ),
              },
              {
                id: "employee",
                label: t("hr.employee"),
                value: doc.employee.fullName,
              },
              {
                id: "department",
                label: t("masterData.department"),
                value: doc.employee.department,
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
                    id: "employee",
                    label: t("hr.employee"),
                    value: (
                      <Link
                        href={`/dashboard/hr/employees/${doc.employee.id}`}
                        className="cursor-pointer text-[var(--accent)] hover:underline"
                      >
                        {doc.employee.fullName}
                      </Link>
                    ),
                    span: "md",
                  },
                  {
                    id: "employee-number",
                    label: t("masterData.employeeNumber", "Employee #"),
                    value: doc.employee.employeeNumber,
                    mono: true,
                    span: "sm",
                  },
                  {
                    id: "position",
                    label: t("masterData.position"),
                    value: doc.employee.position,
                    span: "sm",
                  },
                  {
                    id: "location",
                    label: t("masterData.workLocation"),
                    value: doc.employee.workLocation,
                    span: "sm",
                  },
                  {
                    id: "type",
                    label: t("hr.documentType"),
                    value: doc.documentType,
                    span: "sm",
                  },
                ]}
              />
            </EntitySection>

            <EntityNotesEditor value={doc.notes} canEdit={canWrite} onSave={async (notes) => {
              await updateMutation.mutateAsync({ id, input: { notes } });
            }} />

            <EntityLinkedAttachments
              module="HR"
              entityType="employee_document"
              entityId={doc.id}
            />
          </>
        }
        footer={<EntityAudit meta={{ id: doc.id }} />}
        sidebar={
          <>
            <EntityWorkflow
              statusLabel={t(`hr.documentStatus.${doc.status}`, statusLabel(doc.status))}
              steps={workflowSteps}
              defaultOpen
            />
            <EntityOwner
              name={doc.employee.fullName}
              role={t("hr.employee")}
              defaultOpen
            />
            <EntityRelations
              items={[
                {
                  id: "employee",
                  label: doc.employee.fullName,
                  description: t("hr.employee"),
                  meta: doc.employee.employeeNumber,
                  href: `/dashboard/hr/employees/${doc.employee.id}`,
                },
              ]}
            />
          </>
        }
      />
      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader><DialogTitle>{t("entityWorkspace.action.edit")} — {doc.title}</DialogTitle></DialogHeader>
          <form className="space-y-4" onSubmit={(e) => void handleEditSubmit(e)}>
            <ActionFeedback error={editError} />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Title" required><input className={inputClassName} value={editTitle} onChange={(e) => setEditTitle(e.target.value)} disabled={editSubmitting} /></FormField>
              <FormField label={t("hr.documentType")} required><input className={inputClassName} value={editType} onChange={(e) => setEditType(e.target.value)} disabled={editSubmitting} /></FormField>
              <SelectField id="document-status" label="Status" value={editStatus} onChange={(v) => setEditStatus(v as DocumentStatus)} options={DOCUMENT_STATUS_OPTIONS} disabled={editSubmitting} />
              <DatePicker id="document-expiry" label={t("hr.expiryDate")} value={editExpiry} onChange={setEditExpiry} optional disabled={editSubmitting} />
            </div>
            <FormActions cancelLabel={t("form.cancel")} submitLabel={t("masterData.saveChanges")} loading={editSubmitting} disabled={editSubmitting} onCancel={() => handleEditOpenChange(false)} />
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
