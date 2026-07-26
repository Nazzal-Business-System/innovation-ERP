"use client";

import { use, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, Archive, ArchiveRestore, Download, ExternalLink, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DatePicker } from "@/components/forms/date-picker";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { ModuleLayout } from "@/components/layout/module-layout";
import { DocumentsNavLinks } from "@/components/documents/documents-gate";
import {
  DOCUMENT_MODULE_LABELS,
  DOCUMENT_STATUS_LABELS,
  formatBytes,
} from "@/components/documents/documents-columns";
import { DocumentDetailSkeleton } from "@/components/documents/documents-page-skeleton";
import {
  EntityActionBar,
  EntityAudit,
  EntityFieldGrid,
  EntityHeader,
  EntityMetrics,
  EntityNotes,
  EntityOwner,
  EntityRelations,
  EntitySection,
  EntityStatus,
  EntityTitle,
  EntityWorkflow,
  OperationalWorkspace,
} from "@/components/entity-workspace";
import type { EntityAction } from "@/lib/entity-workspace";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/date";
import { getDocumentPreview } from "@/lib/document-preview-store";
import {
  useArchiveDocumentFile,
  useRestoreDocumentFile,
  useDocumentCategories,
  useDocumentFile,
  useUpdateDocumentFile,
} from "@/lib/hooks/use-documents";
import { usePermissions } from "@/lib/hooks/use-permissions";
import { useI18n } from "@/lib/i18n";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { DOCUMENTS_PERMISSIONS, type ErpDocumentStatus } from "@ierp/shared";

const DocumentPreviewer = dynamic(
  () =>
    import("@/components/documents/document-previewer").then((m) => ({
      default: m.DocumentPreviewer,
    })),
  {
    loading: () => (
      <div className="min-h-[200px] animate-pulse rounded-xl bg-[var(--muted-bg)]" />
    ),
  }
);

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t, locale } = useI18n();
  const { has } = usePermissions();
  const canWrite = has(DOCUMENTS_PERMISSIONS.WRITE);
  const { data: file, loading, error, refetch } = useDocumentFile(id);
  const { data: categoriesData } = useDocumentCategories({});
  const archiveMutation = useArchiveDocumentFile();
  const restoreMutation = useRestoreDocumentFile();
  const updateMutation = useUpdateDocumentFile();
  const [archiving, setArchiving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategoryId, setEditCategoryId] = useState("");
  const [editExpiryDate, setEditExpiryDate] = useState("");
  const [editStatus, setEditStatus] = useState<Exclude<ErpDocumentStatus, "ARCHIVED">>("ACTIVE");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const localFile = useMemo(() => getDocumentPreview(id), [id]);

  function openEditDialog() {
    if (!file || file.status === "ARCHIVED") return;
    setEditTitle(file.title);
    setEditDescription(file.description ?? "");
    setEditCategoryId(file.categoryId ?? "");
    setEditExpiryDate(file.expiryDate?.slice(0, 10) ?? "");
    setEditStatus(file.status);
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
    if (!file || !canWrite || file.status === "ARCHIVED" || editSubmitting || !editTitle.trim()) {
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    try {
      await updateMutation.mutateAsync({
        id,
        input: {
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          categoryId: editCategoryId || null,
          expiryDate: editExpiryDate || null,
          status: editStatus,
        },
      });
      setEditOpen(false);
      setActionSuccess("Document metadata updated.");
    } catch (err) {
      setEditError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setEditSubmitting(false);
    }
  }

  async function handleArchive() {
    if (
      !file ||
      !canWrite ||
      file.status === "ARCHIVED" ||
      archiveMutation.isPending ||
      restoreMutation.isPending
    ) {
      return;
    }
    setArchiving(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await archiveMutation.mutateAsync({ id });
      setActionSuccess(t("documents.archived"));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setArchiving(false);
    }
  }

  async function handleRestore() {
    if (
      !file ||
      !canWrite ||
      file.status !== "ARCHIVED" ||
      archiveMutation.isPending ||
      restoreMutation.isPending
    ) {
      return;
    }
    setRestoring(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await restoreMutation.mutateAsync({ id });
      setActionSuccess(t("documents.restored", "Document restored"));
    } catch (err) {
      setActionError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setRestoring(false);
    }
  }

  function handleOpenFile() {
    if (!localFile?.dataUrl) return;
    window.open(localFile.dataUrl, "_blank", "noopener,noreferrer");
  }

  function handleDownloadFile() {
    if (!localFile?.dataUrl) return;
    const anchor = document.createElement("a");
    anchor.href = localFile.dataUrl;
    anchor.download = localFile.fileName || file?.fileName || "document";
    anchor.click();
  }

  if (loading) {
    return (
      <ModuleLayout>
        <DocumentDetailSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !file) {
    return (
      <ModuleLayout maxWidth="lg">
        <OperationalWorkspace
          entityType="document-file"
          entityId={id}
          error={error ?? t("documents.fileNotFound")}
          onRetry={() => void refetch()}
          header={<div />}
          main={<div />}
        />
      </ModuleLayout>
    );
  }

  const statusVariant =
    file.status === "ACTIVE"
      ? "success"
      : file.status === "PENDING_REVIEW"
        ? "warning"
        : file.status === "EXPIRED"
          ? "destructive"
          : "secondary";
  const actions: EntityAction[] = [
    ...(localFile?.dataUrl
      ? [
          {
            id: "open",
            label: t("documents.openFile"),
            icon: <ExternalLink className="h-3.5 w-3.5" aria-hidden />,
            kind: "primary" as const,
            capability: "read",
            onSelect: handleOpenFile,
          },
          {
            id: "download",
            label: t("documents.downloadFile"),
            icon: <Download className="h-3.5 w-3.5" aria-hidden />,
            kind: "secondary" as const,
            capability: "read",
            onSelect: handleDownloadFile,
          },
        ]
      : []),
    ...(canWrite && file.status !== "ARCHIVED"
      ? [
          {
            id: "edit",
            label: "Edit metadata",
            icon: <Pencil className="h-3.5 w-3.5" aria-hidden />,
            kind: "secondary" as const,
            capability: "edit",
            onSelect: openEditDialog,
          },
        ]
      : []),
    ...(canWrite && file.status !== "ARCHIVED"
      ? [
          {
            id: "archive",
            label: t("documents.archive"),
            icon: <Archive className="h-3.5 w-3.5" aria-hidden />,
            kind: "destructive" as const,
            capability: "archive",
            pending: archiving,
            confirm: "hard" as const,
            confirmTitle: `${t("documents.archive")} — ${file.title}`,
            confirmDescription: t(
              "entityWorkspace.confirmDescription",
              "This action will update the record."
            ),
            onSelect: () => void handleArchive(),
          },
        ]
      : []),
    ...(canWrite && file.status === "ARCHIVED"
      ? [
          {
            id: "restore",
            label: t("masterData.restore", "Restore"),
            icon: <ArchiveRestore className="h-3.5 w-3.5" aria-hidden />,
            kind: "secondary" as const,
            capability: "restore",
            pending: restoring,
            confirm: "soft" as const,
            confirmTitle: `${t("masterData.restore", "Restore")} — ${file.title}`,
            confirmDescription: t(
              "documents.restoreConsequence",
              "This document will become active again and can be edited."
            ),
            onSelect: () => void handleRestore(),
          },
        ]
      : []),
  ];
  const relations = file.links.map((link) => ({
    id: link.id,
    label: link.entityLabel || `${link.entityType} / ${link.entityId}`,
    description: DOCUMENT_MODULE_LABELS[link.module],
    meta: link.entityId,
  }));

  return (
    <ModuleLayout>
      <div className="mb-2">
        <Button asChild variant="ghost" size="sm" className="cursor-pointer gap-2">
          <Link href="/dashboard/documents/files">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
            {t("documents.backToFiles")}
          </Link>
        </Button>
      </div>

      <ActionFeedback error={actionError} success={actionSuccess} />
      <DocumentsNavLinks />

      <OperationalWorkspace
        entityType="document-file"
        entityId={file.id}
        readOnly={!canWrite}
        header={
          <EntityHeader
            breadcrumbs={[
              { label: t("documents.filesTitle"), href: "/dashboard/documents/files" },
              { label: file.fileNumber },
            ]}
          >
            <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <EntityTitle
                title={file.title}
                subtitle={<span className="ew-ltr-isolate font-mono">{file.fileNumber}</span>}
                trailing={
                  <EntityStatus
                    label={DOCUMENT_STATUS_LABELS[file.status]}
                    variant={statusVariant}
                  />
                }
              />
              <EntityActionBar
                actions={actions}
                capabilities={
                  canWrite
                    ? ["read", "edit", file.status === "ARCHIVED" ? "restore" : "archive"]
                    : ["read"]
                }
              />
            </div>
          </EntityHeader>
        }
        metrics={
          <EntityMetrics
            items={[
              {
                id: "size",
                label: t("documents.fileSize"),
                value: formatBytes(file.fileSize),
              },
              {
                id: "links",
                label: t("documents.linkedRecords"),
                value: String(file.links.length),
              },
              {
                id: "uploaded",
                label: t("documents.uploadedAt"),
                value: <span className="ew-ltr-isolate">{formatDisplayDateTime(file.uploadedAt, locale)}</span>,
              },
              {
                id: "expiry",
                label: t("documents.expiryDate"),
                value: (
                  <span className="ew-ltr-isolate">{formatDisplayDate(file.expiryDate, locale)}</span>
                ),
                hint: file.isExpiringSoon ? t("documents.expiringSoon") : undefined,
              },
            ]}
          />
        }
        main={
          <>
            <EntitySection id="preview" title={t("documents.fileName")} defaultOpen>
              <DocumentPreviewer
                documentId={file.id}
                fileName={file.fileName}
                mimeType={file.mimeType}
                fileUrl={file.fileUrl}
                title={file.title}
              />
            </EntitySection>

            <EntitySection id="metadata" title={t("documents.fileMetadata")} defaultOpen>
              <EntityFieldGrid
                fields={[
                  {
                    id: "file-name",
                    label: t("documents.fileName"),
                    value: file.fileName,
                    mono: true,
                  },
                  {
                    id: "mime-type",
                    label: t("documents.mimeType"),
                    value: file.mimeType,
                    mono: true,
                  },
                  {
                    id: "category",
                    label: t("documents.category"),
                    value: file.category?.name ?? "—",
                  },
                  {
                    id: "primary-module",
                    label: t("documents.module"),
                    value: file.primaryModule
                      ? DOCUMENT_MODULE_LABELS[file.primaryModule]
                      : "—",
                  },
                  {
                    id: "uploaded-at",
                    label: t("documents.uploadedAt"),
                    value: formatDisplayDateTime(file.uploadedAt, locale),
                  },
                  {
                    id: "expiry-date",
                    label: t("documents.expiryDate"),
                    value: formatDisplayDate(file.expiryDate, locale),
                  },
                ]}
              />
            </EntitySection>

            <EntityNotes
              title={t("documents.docDescription")}
              notes={file.description ? [{ id: "description", body: file.description }] : []}
            />
          </>
        }
        sidebar={
          <>
            <EntityWorkflow statusLabel={DOCUMENT_STATUS_LABELS[file.status]} defaultOpen />
            {file.uploadedBy ? (
              <EntityOwner name={file.uploadedBy.name} role={file.uploadedBy.email} defaultOpen />
            ) : null}
            <EntityRelations
              items={relations}
              title={t("documents.linkedRecords")}
              emptyTitle={t("documents.noLinkedDocuments")}
              emptyDescription=""
            />
          </>
        }
        footer={
          <EntityAudit
            meta={{
              id: file.id,
              createdAt: formatDisplayDateTime(file.createdAt, locale),
              createdBy: file.uploadedBy?.name,
              updatedAt: formatDisplayDateTime(file.updatedAt, locale),
            }}
          />
        }
      />

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit document metadata</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void handleEditSubmit(e)} className="space-y-4">
            <ActionFeedback error={editError} />
            <FormField label={t("documents.docTitle")} htmlFor="edit-document-title" required>
              <input
                id="edit-document-title"
                className={inputClassName}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={editSubmitting}
                required
              />
            </FormField>
            <FormField label={t("documents.docDescription")} htmlFor="edit-document-description">
              <textarea
                id="edit-document-description"
                className={cn(textareaClassName, "min-h-24")}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={editSubmitting}
              />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="edit-document-category"
                label={t("documents.category")}
                value={editCategoryId}
                onChange={setEditCategoryId}
                options={[
                  { value: "", label: t("documents.noCategory") },
                  ...(categoriesData?.data ?? []).map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
                disabled={editSubmitting}
              />
              <SelectField
                id="edit-document-status"
                label="Status"
                value={editStatus}
                onChange={(value) =>
                  setEditStatus(value as Exclude<ErpDocumentStatus, "ARCHIVED">)
                }
                options={(["ACTIVE", "PENDING_REVIEW", "EXPIRED"] as const).map((value) => ({
                  value,
                  label: DOCUMENT_STATUS_LABELS[value],
                }))}
                disabled={editSubmitting}
              />
              <DatePicker
                id="edit-document-expiry"
                label={t("documents.expiryDate")}
                value={editExpiryDate}
                onChange={setEditExpiryDate}
                optional
                disabled={editSubmitting}
              />
            </div>
            <FormActions
              cancelLabel={t("form.cancel")}
              submitLabel={t("common.save")}
              loading={editSubmitting}
              disabled={editSubmitting || !editTitle.trim()}
              onCancel={() => handleEditOpenChange(false)}
            />
          </form>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
