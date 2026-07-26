"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormActions } from "@/components/forms/form-actions";
import { FormField } from "@/components/forms/form-field";
import { SelectField } from "@/components/forms/select-field";
import { shouldAllowEditDialogClose } from "@/lib/entity-workspace/edit-dialog";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { inputClassName } from "@/lib/form-utils";
import { useCreatePosition, useHrDepartments } from "@/lib/hooks/use-hr";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import type { CreatePositionInput } from "@ierp/shared";

type CreatePositionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  navigateOnSuccess?: boolean;
};

export function CreatePositionDialog({
  open,
  onOpenChange,
  navigateOnSuccess = true,
}: CreatePositionDialogProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const createMutation = useCreatePosition();
  const { data: departments } = useHrDepartments();

  const [departmentId, setDepartmentId] = useState("");
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const departmentOptions = useMemo(
    () => (departments?.data ?? []).map((d) => ({ value: d.id, label: d.name })),
    [departments]
  );

  const busy = submitting || createMutation.isPending;

  function resetForm() {
    setDepartmentId("");
    setTitle("");
    setLevel("");
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
    if (!departmentId) errors.departmentId = t("hr.departmentRequired", "Department is required.");
    if (!title.trim()) errors.title = t("hr.titleRequired", "Title is required.");
    if (!level.trim()) errors.level = t("hr.levelRequired", "Level is required.");
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setError(null);
      return;
    }

    const input: CreatePositionInput = {
      departmentId,
      title: title.trim(),
      level: level.trim(),
      isActive: true,
    };

    setSubmitting(true);
    setError(null);
    setFieldErrors({});
    try {
      const created = await createMutation.mutateAsync(input);
      resetForm();
      onOpenChange(false);
      if (navigateOnSuccess) {
        const href = `/dashboard/hr/positions/${created.id}`;
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
          <DialogTitle>{t("hr.createPosition", "Create position")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)} noValidate>
          <ActionFeedback error={error} />
          <SelectField
            id="create-position-department"
            label={t("hr.department")}
            value={departmentId}
            onChange={setDepartmentId}
            options={[{ value: "", label: t("hr.selectDepartment", "Select department…") }, ...departmentOptions]}
            required
            error={fieldErrors.departmentId}
            disabled={busy}
          />
          <FormField label={t("hr.positionTitle", "Title")} htmlFor="create-position-title" required error={fieldErrors.title}>
            <input
              id="create-position-title"
              className={inputClassName}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={busy}
              autoFocus
            />
          </FormField>
          <FormField label={t("hr.level")} htmlFor="create-position-level" required error={fieldErrors.level}>
            <input
              id="create-position-level"
              className={inputClassName}
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              disabled={busy}
              placeholder={t("hr.levelPlaceholder", "e.g. Junior, Senior, Lead")}
            />
          </FormField>
          <FormActions
            cancelLabel={t("form.cancel")}
            submitLabel={t("hr.createPosition", "Create position")}
            loading={busy}
            disabled={busy}
            onCancel={() => handleOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
