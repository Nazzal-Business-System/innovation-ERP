"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { useCreateDepartment } from "@/lib/hooks/use-hr";
import { useI18n } from "@/lib/i18n";
import type { CreateDepartmentInput } from "@ierp/shared";

type CreateDepartmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateDepartmentDialog({ open, onOpenChange }: CreateDepartmentDialogProps) {
  const { t } = useI18n();
  const createMutation = useCreateDepartment();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const busy = submitting || createMutation.isPending;

  function resetForm() {
    setName("");
    setCode("");
    setDescription("");
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
    if (!name.trim()) errors.name = t("masterData.nameRequired");
    if (!code.trim()) errors.code = t("masterData.codeRequired", "Code is required.");
    else if (code.trim().length > 32) {
      errors.code = t("masterData.codeTooLong", "Code must be 32 characters or fewer.");
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(null);
      return;
    }

    const input: CreateDepartmentInput = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      description: description.trim() || null,
      isActive: true,
    };

    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      await createMutation.mutateAsync(input);
      resetForm();
      onOpenChange(false);
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
          <DialogTitle>{t("hr.createDepartment", "Create department")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)} noValidate>
          <ActionFeedback error={error} />
          <FormField label={t("masterData.name")} htmlFor="create-department-name" required error={fieldErrors.name}>
            <input
              id="create-department-name"
              className={inputClassName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              autoFocus
            />
          </FormField>
          <FormField label={t("masterData.code", "Code")} htmlFor="create-department-code" required error={fieldErrors.code}>
            <input
              id="create-department-code"
              className={`${inputClassName} font-mono uppercase`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={busy}
              maxLength={32}
              autoComplete="off"
              spellCheck={false}
            />
          </FormField>
          <FormField label={t("masterData.description", "Description")} htmlFor="create-department-description">
            <textarea
              id="create-department-description"
              className={textareaClassName}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
            />
          </FormField>
          <FormActions
            cancelLabel={t("form.cancel")}
            submitLabel={t("hr.createDepartment", "Create department")}
            loading={busy}
            disabled={busy}
            onCancel={() => handleOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
