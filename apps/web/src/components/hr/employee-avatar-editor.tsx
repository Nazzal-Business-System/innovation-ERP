"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PersonAvatar, type PersonAvatarPresence } from "@/components/avatar/person-avatar";
import {
  EMPLOYEE_AVATAR_MAX_BYTES,
  isEmployeeAvatarMime,
  readFileAsDataUrl,
  type EmployeeAvatarMime,
} from "@/lib/hr/employee-profile";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { useRemoveEmployeeAvatar, useUploadEmployeeAvatar } from "@/lib/hooks/use-hr";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function EmployeeAvatarEditor({
  employeeId,
  fullName,
  hasAvatar,
  avatarUpdatedAt,
  canEdit,
  className,
  onSuccess,
  presence,
}: {
  employeeId: string;
  fullName: string;
  hasAvatar: boolean;
  avatarUpdatedAt?: string | null;
  canEdit: boolean;
  className?: string;
  onSuccess?: (message: string) => void;
  /** Only when employee has a linked User account. */
  presence?: PersonAvatarPresence;
}) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadMutation = useUploadEmployeeAvatar();
  const removeMutation = useRemoveEmployeeAvatar();

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingMime, setPendingMime] = useState<EmployeeAvatarMime | null>(null);
  const [pendingData, setPendingData] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  const busy = uploadMutation.isPending || removeMutation.isPending;

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingMime(null);
    setPendingData(null);
  }

  async function handleFileChange(file: File | null) {
    if (!file || busy) return;
    setError(null);
    if (!isEmployeeAvatarMime(file.type)) {
      setError(t("hr.avatarTypeInvalid", "Use JPEG, PNG, or WebP."));
      return;
    }
    if (file.size > EMPLOYEE_AVATAR_MAX_BYTES) {
      setError(t("hr.avatarSizeInvalid", "Image must be 2 MB or smaller."));
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      clearPreview();
      setPreviewUrl(URL.createObjectURL(file));
      setPendingMime(file.type);
      setPendingData(dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl);
    } catch {
      setError(t("hr.avatarReadFailed", "Unable to read the selected image."));
    }
  }

  async function savePhoto() {
    if (!pendingMime || !pendingData || busy) return;
    setError(null);
    try {
      await uploadMutation.mutateAsync({
        id: employeeId,
        input: { mimeType: pendingMime, data: pendingData },
      });
      clearPreview();
      onSuccess?.(t("hr.avatarUpdated", "Employee photo updated"));
    } catch (err) {
      setError(mapTransactionUiError(err, t("hr.avatarUploadFailed", "Unable to save photo")));
    }
  }

  async function removePhoto() {
    if (busy) return;
    setError(null);
    try {
      await removeMutation.mutateAsync({ id: employeeId });
      setRemoveOpen(false);
      onSuccess?.(t("hr.avatarRemoved", "Employee photo removed"));
    } catch (err) {
      setError(mapTransactionUiError(err, t("hr.avatarRemoveFailed", "Unable to remove photo")));
    }
  }

  return (
    <div className={cn("relative inline-flex shrink-0", className)}>
      <div className="relative">
        {previewUrl ? (
          <PersonAvatar
            name={fullName}
            source={{ kind: "static", src: previewUrl }}
            size="xl"
            presence={presence}
            noAccount={presence === false}
            ring
            lazy={false}
            editable={
              canEdit
                ? {
                    onPick: () => inputRef.current?.click(),
                    busy,
                    ariaLabel: t("hr.changePhoto", "Change photo"),
                  }
                : null
            }
          />
        ) : (
          <PersonAvatar
            name={fullName}
            source={{
              kind: "employee",
              employeeId,
              hasAvatar,
              avatarUpdatedAt,
            }}
            size="xl"
            presence={presence}
            noAccount={presence === false}
            ring
            lazy={false}
            editable={
              canEdit
                ? {
                    onPick: () => inputRef.current?.click(),
                    busy: uploadMutation.isPending && !previewUrl,
                    ariaLabel: t("hr.changePhoto", "Change photo"),
                  }
                : null
            }
          />
        )}

        {canEdit ? (
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
          />
        ) : null}
      </div>

      {(previewUrl || error) && canEdit ? (
        <div className="absolute start-full top-0 z-10 ms-3 w-52 space-y-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--card)] p-3 shadow-[var(--shadow-md)]">
          <ActionFeedback error={error} />
          {previewUrl ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                loading={uploadMutation.isPending}
                loadingText={t("form.saving", "Saving…")}
                onClick={() => void savePhoto()}
              >
                {t("hr.savePhoto", "Save photo")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  clearPreview();
                  setError(null);
                }}
              >
                {t("form.cancel")}
              </Button>
            </div>
          ) : null}
          {hasAvatar && !previewUrl ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="gap-1.5 text-[var(--destructive)]"
              disabled={busy}
              onClick={() => setRemoveOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              {t("hr.removePhoto", "Remove photo")}
            </Button>
          ) : null}
        </div>
      ) : null}

      {canEdit && hasAvatar && !previewUrl && !error ? (
        <button
          type="button"
          className="absolute start-full top-8 ms-2 hidden text-xs text-[var(--muted)] underline-offset-2 hover:text-[var(--destructive)] hover:underline sm:inline"
          onClick={() => setRemoveOpen(true)}
        >
          {t("hr.removePhoto", "Remove")}
        </button>
      ) : null}

      <Dialog
        open={removeOpen}
        onOpenChange={(open) => {
          if (removeMutation.isPending) return;
          setRemoveOpen(open);
        }}
      >
        <DialogContent
          onEscapeKeyDown={(e) => {
            if (removeMutation.isPending) e.preventDefault();
          }}
          onPointerDownOutside={(e) => {
            if (removeMutation.isPending) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t("hr.removePhotoTitle", "Remove employee photo?")}</DialogTitle>
            <DialogDescription>
              {t(
                "hr.removePhotoDesc",
                "The profile will fall back to initials. This does not affect any user account photo."
              )}
            </DialogDescription>
          </DialogHeader>
          <ActionFeedback error={error} />
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={removeMutation.isPending}
              onClick={() => setRemoveOpen(false)}
            >
              {t("form.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={removeMutation.isPending}
              loadingText={t("action.deleting", "Deleting…")}
              onClick={() => void removePhoto()}
            >
              {t("hr.removePhoto", "Remove photo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
