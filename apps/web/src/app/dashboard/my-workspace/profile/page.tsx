"use client";

import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import type { UploadAvatarInput } from "@ierp/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ErrorState } from "@/components/feedback/error-state";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { EmploymentStatusBadge } from "@/components/hr/hr-status-badge";
import { PersonAvatar } from "@/components/avatar/person-avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDisplayDate } from "@/lib/date";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { inputClassName } from "@/lib/form-utils";
import {
  EMPLOYEE_AVATAR_MAX_BYTES,
  formatEmployeeTenure,
  isEmployeeAvatarMime,
  readFileAsDataUrl,
  type EmployeeAvatarMime,
} from "@/lib/hr/employee-profile";
import {
  useRemoveSelfAvatar,
  useSelfProfile,
  useUpdateSelfProfile,
  useUploadSelfAvatar,
} from "@/lib/hooks/use-self-service";
import { useI18n } from "@/lib/i18n";
import { HR_SELF_PERMISSIONS } from "@ierp/shared";
import { useAuthStore } from "@/lib/auth-store";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-[var(--border-subtle)] py-3 last:border-b-0 sm:grid-cols-[12rem_1fr] sm:gap-4">
      <dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</dt>
      <dd className="text-sm text-[var(--foreground)]">{value || "—"}</dd>
    </div>
  );
}

export default function MyProfilePage() {
  const { t, locale } = useI18n();
  const permissions = useAuthStore((s) => s.permissions);
  const authUser = useAuthStore((s) => s.user);
  const canWrite = permissions.includes(HR_SELF_PERMISSIONS.WRITE);
  const { data: profile, loading, error, refetch } = useSelfProfile();
  const updateProfile = useUpdateSelfProfile();
  const uploadAvatar = useUploadSelfAvatar();
  const removeAvatar = useRemoveSelfAvatar();

  const [phone, setPhone] = useState("");
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingMime, setPendingMime] = useState<EmployeeAvatarMime | null>(null);
  const [pendingData, setPendingData] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  useEffect(() => {
    if (profile) setPhone(profile.phone ?? "");
  }, [profile]);

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl]
  );

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingMime(null);
    setPendingData(null);
  }

  async function handleSavePhone(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite || updateProfile.isPending) return;
    setFeedbackError(null);
    setFeedbackSuccess(null);
    try {
      await updateProfile.mutateAsync({ phone: phone.trim() || null });
      setFeedbackSuccess(t("selfService.phoneUpdated", "Phone updated"));
    } catch (err) {
      setFeedbackError(mapTransactionUiError(err, t("form.submitFailed")));
    }
  }

  async function handleFileChange(file: File | null) {
    if (!file || !canWrite) return;
    setFeedbackError(null);
    if (!isEmployeeAvatarMime(file.type)) {
      setFeedbackError(t("hr.avatarTypeInvalid", "Use JPEG, PNG, or WebP."));
      return;
    }
    if (file.size > EMPLOYEE_AVATAR_MAX_BYTES) {
      setFeedbackError(t("hr.avatarSizeInvalid", "Image must be 2 MB or smaller."));
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      clearPreview();
      setPreviewUrl(URL.createObjectURL(file));
      setPendingMime(file.type);
      setPendingData(dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl);
    } catch {
      setFeedbackError(t("hr.avatarReadFailed", "Unable to read the selected image."));
    }
  }

  async function savePhoto() {
    if (!pendingMime || !pendingData || uploadAvatar.isPending) return;
    setFeedbackError(null);
    try {
      const body: UploadAvatarInput = { mimeType: pendingMime, data: pendingData };
      await uploadAvatar.mutateAsync(body);
      clearPreview();
      setFeedbackSuccess(t("selfService.photoUpdated", "Photo updated"));
    } catch (err) {
      setFeedbackError(mapTransactionUiError(err, t("hr.avatarUploadFailed", "Unable to save photo")));
    }
  }

  async function removePhoto() {
    if (removeAvatar.isPending) return;
    setFeedbackError(null);
    try {
      await removeAvatar.mutateAsync();
      setRemoveOpen(false);
      setFeedbackSuccess(t("selfService.photoRemoved", "Photo removed"));
    } catch (err) {
      setFeedbackError(mapTransactionUiError(err, t("hr.avatarRemoveFailed", "Unable to remove photo")));
    }
  }

  if (loading && !profile) {
    return (
      <ModuleLayout>
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-56 w-full rounded-2xl" />
        </div>
      </ModuleLayout>
    );
  }

  if (error || !profile) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("selfService.loadFailed", "Unable to load workspace")}
          description={error ?? undefined}
          onRetry={() => void refetch()}
        />
      </ModuleLayout>
    );
  }

  const avatarBusy = uploadAvatar.isPending || removeAvatar.isPending;

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("selfService.profileTitle", "My Profile")}
          description={t("selfService.profileDesc", "Your employee record and contact details.")}
        />
      </FadeIn>

      <ActionFeedback error={feedbackError} success={feedbackSuccess} />

      <FadeIn delay={0.04}>
        <section className="rounded-2xl border border-[var(--border-subtle)] p-5">
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="relative inline-flex shrink-0 flex-col items-center gap-2">
              <PersonAvatar
                name={profile.fullName}
                source={
                  previewUrl
                    ? { kind: "static", src: previewUrl }
                    : {
                        kind: "self-employee",
                        hasAvatar: profile.hasAvatar,
                        avatarUpdatedAt: profile.avatarUpdatedAt,
                      }
                }
                size="xl"
                lazy={false}
                presence={{
                  lastSeenAt: authUser?.lastSeenAt,
                  lastActiveAt: authUser?.lastActiveAt,
                }}
                editable={
                  canWrite
                    ? {
                        onPick: () => inputRef.current?.click(),
                        busy: avatarBusy,
                        ariaLabel: t("selfService.uploadPhoto", "Upload photo"),
                      }
                    : null
                }
              />
              {canWrite && profile.hasAvatar && !previewUrl ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs text-[var(--destructive)]"
                  disabled={avatarBusy}
                  onClick={() => setRemoveOpen(true)}
                >
                  <Trash2 className="h-3 w-3" aria-hidden />
                  {t("selfService.removePhoto", "Remove photo")}
                </Button>
              ) : null}
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  void handleFileChange(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold">{profile.fullName}</h2>
                <EmploymentStatusBadge status={profile.employmentStatus} />
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                <span className="ew-ltr-isolate font-mono">{profile.employeeNumber}</span>
                {" · "}
                {t("selfService.tenure", "Tenure")}: {formatEmployeeTenure(profile.hireDate)}
              </p>
              {pendingData && canWrite ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    loading={uploadAvatar.isPending}
                    onClick={() => void savePhoto()}
                  >
                    {t("selfService.savePhoto", "Save photo")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={avatarBusy}
                    onClick={clearPreview}
                  >
                    {t("selfService.cancelPhoto", "Cancel")}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {canWrite ? (
            <form className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={(e) => void handleSavePhone(e)}>
              <FormField
                htmlFor="self-phone"
                label={t("selfService.editPhone", "Phone")}
                className="min-w-0 flex-1"
              >
                <input
                  id="self-phone"
                  className={inputClassName}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={updateProfile.isPending}
                />
              </FormField>
              <Button type="submit" size="sm" loading={updateProfile.isPending}>
                {t("selfService.savePhone", "Save phone")}
              </Button>
            </form>
          ) : null}

          <dl>
            <DetailRow
              label={t("hr.employeeNumber", "Employee number")}
              value={<span className="ew-ltr-isolate font-mono">{profile.employeeNumber}</span>}
            />
            <DetailRow label={t("hr.email", "Email")} value={profile.email} />
            <DetailRow label={t("hr.phone", "Phone")} value={profile.phone} />
            <DetailRow label={t("hr.department", "Department")} value={profile.department.name} />
            <DetailRow label={t("hr.position", "Position")} value={profile.position.title} />
            <DetailRow
              label={t("selfService.level", "Level")}
              value={profile.position.level}
            />
            <DetailRow
              label={t("hr.salary", "Salary")}
              value={
                profile.canViewSalary !== false && profile.salary ? (
                  <span className="ew-ltr-isolate">{profile.salary}</span>
                ) : (
                  t("selfService.salaryHidden", "Not available")
                )
              }
            />
            <DetailRow
              label={t("selfService.manager", "Manager")}
              value={profile.manager?.fullName}
            />
            <DetailRow
              label={t("hr.status", "Status")}
              value={<EmploymentStatusBadge status={profile.employmentStatus} />}
            />
            <DetailRow label={t("hr.workLocation", "Work location")} value={profile.workLocation} />
            <DetailRow
              label={t("hr.hireDate", "Hire date")}
              value={
                <span className="ew-ltr-isolate">{formatDisplayDate(profile.hireDate, locale)}</span>
              }
            />
          </dl>
        </section>
      </FadeIn>

      <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("selfService.removePhoto", "Remove photo")}</DialogTitle>
            <DialogDescription>
              {t("hr.avatarRemoveConfirm", "Remove your current profile photo?")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={removeAvatar.isPending}
              onClick={() => setRemoveOpen(false)}
            >
              {t("form.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              loading={removeAvatar.isPending}
              onClick={() => void removePhoto()}
            >
              {t("selfService.removePhoto", "Remove photo")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
