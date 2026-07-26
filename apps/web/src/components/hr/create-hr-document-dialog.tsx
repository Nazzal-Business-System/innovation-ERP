"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DocumentUploadZone,
  type SelectedUploadFile,
} from "@/components/documents/document-upload-zone";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { DatePicker } from "@/components/forms/date-picker";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { fileToDataUrl, saveDocumentPreview } from "@/lib/document-preview-store";
import { useCreateDocumentFile } from "@/lib/hooks/use-documents";
import { useCreateHrDocument, useHrEmployees } from "@/lib/hooks/use-hr";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import type { CreateHrDocumentInput, DocumentStatus } from "@ierp/shared";

const DOCUMENT_TYPES = [
  "Passport",
  "Work Permit",
  "ID Card",
  "Certificate",
  "Contract Copy",
  "Other",
];

const DOCUMENT_STATUSES: Array<{ value: DocumentStatus; label: string }> = [
  { value: "PENDING_REVIEW", label: "Pending review" },
  { value: "VALID", label: "Valid" },
  { value: "MISSING", label: "Missing" },
];

type CreateHrDocumentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigateOnSuccess?: boolean;
};

export function CreateHrDocumentDialog({
  open,
  onOpenChange,
  navigateOnSuccess = true,
}: CreateHrDocumentDialogProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const createMutation = useCreateHrDocument();
  const createFileMutation = useCreateDocumentFile();
  const { data: employeesData } = useHrEmployees({ active: true, page: 1, limit: 100 });

  const [employeeId, setEmployeeId] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [title, setTitle] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [status, setStatus] = useState<DocumentStatus>("VALID");
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<SelectedUploadFile | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const employeeOptions = useMemo(
    () =>
      (employeesData?.data ?? []).map((emp) => ({
        value: emp.id,
        label: `${emp.fullName} (${emp.employeeNumber})`,
      })),
    [employeesData]
  );

  const busy = submitting || createMutation.isPending || createFileMutation.isPending;

  function resetForm() {
    setEmployeeId("");
    setDocumentType("");
    setTitle("");
    setExpiryDate("");
    setStatus("VALID");
    setNotes("");
    if (selectedFile?.previewUrl) URL.revokeObjectURL(selectedFile.previewUrl);
    setSelectedFile(null);
    setFieldErrors({});
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!shouldAllowEditDialogClose(busy, next)) return;
    onOpenChange(next);
    if (!next) {
      setFieldErrors({});
      setError(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;

    const errors: Record<string, string> = {};
    if (!employeeId) errors.employeeId = t("form.required", "Required");
    if (!documentType.trim()) errors.documentType = t("form.required", "Required");
    if (!title.trim()) errors.title = t("form.required", "Required");
    if (selectedFile && selectedFile.meta.fileSize > 25 * 1024 * 1024) {
      errors.file = t("documents.fileTooLarge", "File must be 25 MB or smaller.");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(null);
      return;
    }

    const input: CreateHrDocumentInput = {
      employeeId,
      documentType: documentType.trim(),
      title: title.trim(),
      expiryDate: expiryDate || undefined,
      status,
      notes: notes.trim() || undefined,
    };

    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const created = await createMutation.mutateAsync(input);

      if (selectedFile) {
        try {
          const file = await createFileMutation.mutateAsync({
            title: title.trim(),
            description: notes.trim() || null,
            categoryId: null,
            fileName: selectedFile.meta.fileName,
            mimeType: selectedFile.meta.mimeType,
            fileSize: selectedFile.meta.fileSize,
            status: "ACTIVE",
            expiryDate: expiryDate || null,
            link: {
              module: "HR",
              entityType: "employee_document",
              entityId: created.id,
            },
          });
          try {
            const dataUrl = await fileToDataUrl(selectedFile.file);
            saveDocumentPreview(file.id, {
              dataUrl,
              mimeType: selectedFile.meta.mimeType,
              fileName: selectedFile.meta.fileName,
              storedAt: new Date().toISOString(),
            });
          } catch {
            // Local preview optional
          }
        } catch (uploadErr) {
          setError(
            mapTransactionUiError(
              uploadErr,
              t("hr.documentCreatedUploadFailed", "Document created, but file linking failed.")
            )
          );
          // Still navigate — metadata record exists
        }
      }

      resetForm();
      onOpenChange(false);
      if (navigateOnSuccess) {
        const href = `/dashboard/hr/documents/${created.id}`;
        startNavigation(href);
        router.push(href);
      }
    } catch (err) {
      setError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("hr.createDocument", "Create employee document")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)} noValidate>
          <ActionFeedback error={error} />
          <SelectField
            id="create-document-employee"
            label={t("hr.employee")}
            value={employeeId}
            onChange={setEmployeeId}
            options={[
              { value: "", label: t("hr.selectEmployee", "Select employee…") },
              ...employeeOptions,
            ]}
            required
            error={fieldErrors.employeeId}
            disabled={busy}
          />
          <FormField
            label={t("hr.documentType")}
            htmlFor="create-document-type"
            required
            error={fieldErrors.documentType}
          >
            <input
              id="create-document-type"
              className={inputClassName}
              list="hr-document-types"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              disabled={busy}
              autoFocus
            />
            <datalist id="hr-document-types">
              {DOCUMENT_TYPES.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
          </FormField>
          <FormField label={t("masterData.title", "Title")} htmlFor="create-document-title" required error={fieldErrors.title}>
            <input
              id="create-document-title"
              className={inputClassName}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
            />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="create-document-status"
              label={t("hr.status", "Status")}
              value={status}
              onChange={(v) => setStatus(v as DocumentStatus)}
              options={DOCUMENT_STATUSES.map((opt) => ({
                value: opt.value,
                label: t(`hr.documentStatus.${opt.value}`, opt.label),
              }))}
              disabled={busy}
            />
            <DatePicker
              id="create-document-expiry"
              label={t("hr.expiryDate")}
              value={expiryDate}
              onChange={setExpiryDate}
              optional
              disabled={busy}
            />
          </div>
          <FormField label={t("masterData.notes", "Notes")} htmlFor="create-document-notes">
            <textarea
              id="create-document-notes"
              className={textareaClassName}
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={busy}
            />
          </FormField>
          <FormField
            label={t("hr.attachFile", "Attach file")}
            htmlFor="create-document-file"
            error={fieldErrors.file}
            hint={t(
              "hr.attachFileHint",
              "Optional. Links a Documents module file to this HR record — no raw URL editing."
            )}
          >
            <DocumentUploadZone value={selectedFile} onChange={setSelectedFile} disabled={busy} />
          </FormField>
          <FormActions
            cancelLabel={t("form.cancel")}
            submitLabel={t("hr.createDocument", "Create employee document")}
            loading={busy}
            disabled={busy}
            onCancel={() => handleOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
