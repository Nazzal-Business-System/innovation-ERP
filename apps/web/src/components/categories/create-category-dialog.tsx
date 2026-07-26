"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { inputClassName, textareaClassName } from "@/lib/form-utils";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";

export type CreateCategoryFormValues = {
  name: string;
  code?: string;
  description?: string | null;
  isActive?: boolean;
};

type CreateCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** When true, code is required (Knowledge). When false, code is optional/auto (Documents/Support). */
  requireCode?: boolean;
  codeHint?: string;
  detailHref: (id: string) => string;
  navigateOnSuccess?: boolean;
  onCreated?: (id: string) => void;
  onSubmit: (input: CreateCategoryFormValues) => Promise<{ id: string }>;
  isPending?: boolean;
};

/**
 * Shared Create Category dialog for Documents / Knowledge / Support category masters.
 */
export function CreateCategoryDialog({
  open,
  onOpenChange,
  title,
  requireCode = false,
  codeHint,
  detailHref,
  navigateOnSuccess = true,
  onCreated,
  onSubmit,
  isPending = false,
}: CreateCategoryDialogProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const busy = submitting || isPending;

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
    if (requireCode && !code.trim()) {
      errors.code = t("masterData.codeRequired", "Code is required.");
    } else if (code.trim() && code.trim().length > 32) {
      errors.code = t("masterData.codeTooLong", "Code must be 32 characters or fewer.");
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(null);
      return;
    }

    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const created = await onSubmit({
        name: name.trim(),
        ...(code.trim() ? { code: code.trim().toUpperCase() } : {}),
        description: description.trim() || null,
        isActive: true,
      });
      resetForm();
      onOpenChange(false);
      onCreated?.(created.id);
      if (navigateOnSuccess) {
        const href = detailHref(created.id);
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)} noValidate>
          <ActionFeedback error={error} />

          <FormField label={t("masterData.name")} htmlFor="create-category-name" required error={fieldErrors.name}>
            <input
              id="create-category-name"
              className={inputClassName}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
              autoFocus
              required
            />
          </FormField>

          <FormField
            label={t("masterData.code", "Code")}
            htmlFor="create-category-code"
            required={requireCode}
            error={fieldErrors.code}
            hint={
              codeHint ??
              (requireCode
                ? undefined
                : t("masterData.codeAutoHint", "Leave blank to auto-generate a code."))
            }
          >
            <input
              id="create-category-code"
              className={`${inputClassName} font-mono uppercase`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={busy}
              maxLength={32}
              autoComplete="off"
              spellCheck={false}
            />
          </FormField>

          <FormField label={t("masterData.description", "Description")} htmlFor="create-category-description">
            <textarea
              id="create-category-description"
              className={textareaClassName}
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={busy}
            />
          </FormField>

          <FormActions
            cancelLabel={t("form.cancel")}
            submitLabel={title}
            loading={busy}
            disabled={busy}
            onCancel={() => handleOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
