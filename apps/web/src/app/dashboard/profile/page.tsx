"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Eye,
  EyeOff,
  Globe2,
  KeyRound,
  Laptop,
  LockKeyhole,
  MapPin,
  Pencil,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  UserRound,
} from "lucide-react";
import { UserAvatar } from "@/components/auth/user-avatar";
import { PersonAvatar } from "@/components/avatar/person-avatar";
import { PresenceBadge } from "@/components/presence/presence-badge";
import { ErrorState } from "@/components/feedback/error-state";
import { ActionFeedback } from "@/components/forms/action-feedback";
import { FormField } from "@/components/forms/form-field";
import { ModuleLayout } from "@/components/layout/module-layout";
import {
  EntityAudit,
  MasterDataWorkspace,
} from "@/components/entity-workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  changeUserPassword,
  fetchUserProfile,
  removeUserAvatar,
  updateUserProfile,
  uploadUserAvatar,
  useAuthStore,
} from "@/lib/auth-store";
import { isEmployeeSelfServiceUser } from "@/lib/auth-home-route";
import { formatDisplayDateTime } from "@/lib/date";
import { mapTransactionUiError } from "@/lib/entity-workspace/transaction-errors";
import { inputClassName } from "@/lib/form-utils";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { UploadAvatarInput, UserProfile } from "@ierp/shared";

const ALLOWED_AVATAR_TYPES = new Set<UploadAvatarInput["mimeType"]>([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const PERMISSION_GROUPS: Array<{ id: string; modules: string[]; fallback: string }> = [
  { id: "crm", modules: ["crm"], fallback: "CRM" },
  { id: "sales", modules: ["sales"], fallback: "Sales" },
  { id: "finance", modules: ["finance"], fallback: "Finance" },
  { id: "accounting", modules: ["accounting"], fallback: "Accounting" },
  { id: "procurement", modules: ["procurement"], fallback: "Procurement" },
  { id: "inventory", modules: ["inventory"], fallback: "Inventory" },
  { id: "operations", modules: ["operations"], fallback: "Operations" },
  { id: "hr", modules: ["hr"], fallback: "HR" },
  { id: "projects", modules: ["projects"], fallback: "Projects" },
  { id: "support", modules: ["support"], fallback: "Support" },
  { id: "documents", modules: ["documents"], fallback: "Documents" },
  { id: "knowledge", modules: ["knowledge"], fallback: "Knowledge" },
  {
    id: "administration",
    modules: ["settings", "users", "roles", "organization", "branches", "audit", "notifications"],
    fallback: "Administration",
  },
];

type Translate = (key: string, fallback?: string) => string;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function permissionLabel(t: Translate, key: string): string {
  const direct = t(`permissions.${key}`);
  if (direct !== `permissions.${key}`) return direct;
  const [section, action] = key.split(".");
  if (!section || !action) return key;
  return `${action.replaceAll("_", " ")} ${section.replaceAll("_", " ")}`;
}

function getPasswordStrength(value: string) {
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  return Math.min(4, score);
}

function getDeviceInfo() {
  if (typeof navigator === "undefined") {
    return { browser: "—", os: "—", device: "—" };
  }
  const ua = navigator.userAgent;
  const browser = ua.includes("Edg/")
    ? "Microsoft Edge"
    : ua.includes("Chrome/")
      ? "Google Chrome"
      : ua.includes("Firefox/")
        ? "Mozilla Firefox"
        : ua.includes("Safari/")
          ? "Safari"
          : "Web browser";
  const os = ua.includes("Windows")
    ? "Windows"
    : ua.includes("Mac OS")
      ? "macOS"
      : ua.includes("Android")
        ? "Android"
        : /iPhone|iPad/.test(ua)
          ? "iOS"
          : ua.includes("Linux")
            ? "Linux"
            : "Unknown OS";
  const device = /Android|iPhone|iPad|Mobile/.test(ua) ? "Mobile device" : "This computer";
  return { browser, os, device };
}

function ProfileSection({
  id,
  icon,
  title,
  description,
  action,
  children,
  className,
}: {
  id: string;
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] shadow-[var(--shadow-sm)] transition-all duration-200 hover:border-[var(--border)] hover:shadow-[var(--shadow-md)]",
        className
      )}
    >
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)]">
            {icon}
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold tracking-tight text-[var(--foreground)]">{title}</h2>
            {description ? (
              <p className="mt-0.5 text-sm leading-relaxed text-[var(--muted)]">{description}</p>
            ) : null}
          </div>
        </div>
        {action}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </section>
  );
}

function InfoItem({
  label,
  value,
  icon,
  mono,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="group min-w-0 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--muted-bg)]/60">
      <dt className="flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
        {icon}
        {label}
      </dt>
      <dd className={cn("mt-1.5 min-w-0 break-words text-sm font-medium", mono && "ew-ltr-isolate font-mono")}>
        {value}
      </dd>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  autoComplete,
  error,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
  autoComplete: string;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <FormField label={label} htmlFor={id} required error={error}>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          className={cn(inputClassName, "pe-11")}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          required
        />
        <button
          type="button"
          className="ierp-focus-ring absolute end-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--muted-bg)] hover:text-[var(--foreground)]"
          onClick={onToggle}
          aria-label={visible ? "Hide password" : "Show password"}
          disabled={disabled}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </FormField>
  );
}

export default function ProfilePage() {
  const { t, locale } = useI18n();
  const applyUserPatch = useAuthStore((state) => state.applyUserPatch);
  const applySessionPayload = useAuthStore((state) => state.applySessionPayload);
  const permissions = useAuthStore((state) => state.permissions);
  const employeeSelfService = isEmployeeSelfServiceUser(permissions);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProfile(await fetchUserProfile());
    } catch (err) {
      setError(mapTransactionUiError(err, t("profile.notFound")));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editJobTitle, setEditJobTitle] = useState("");
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  const editDirty = Boolean(
    profile &&
      (editName !== profile.name ||
        editPhone !== (profile.phone ?? "") ||
        (!employeeSelfService && editJobTitle !== (profile.jobTitle ?? "")))
  );

  function openEditSheet() {
    if (!profile) return;
    setEditName(profile.name);
    setEditPhone(profile.phone ?? "");
    setEditJobTitle(profile.jobTitle ?? "");
    setEditErrors({});
    setEditError(null);
    setEditOpen(true);
  }

  function handleEditOpenChange(open: boolean) {
    if (!open) {
      if (editSubmitting) return;
      if (editDirty) {
        setDiscardConfirmOpen(true);
        return;
      }
    }
    setEditOpen(open);
    if (!open) {
      setEditErrors({});
      setEditError(null);
    }
  }

  function discardEditChanges() {
    setDiscardConfirmOpen(false);
    setEditOpen(false);
    setEditErrors({});
    setEditError(null);
  }

  async function handleEditSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || editSubmitting) return;
    if (!editName.trim()) {
      setEditErrors({ name: t("masterData.nameRequired") });
      return;
    }
    setEditSubmitting(true);
    setEditError(null);
    setEditErrors({});
    try {
      const result = await updateUserProfile({
        name: editName.trim(),
        phone: editPhone.trim() || null,
        ...(employeeSelfService ? {} : { jobTitle: editJobTitle.trim() || null }),
      });
      applyUserPatch(result.user);
      setProfile(result.profile);
      setEditOpen(false);
      setActionSuccess(t("profile.saved"));
    } catch (err) {
      setEditError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setEditSubmitting(false);
    }
  }

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarPending, setAvatarPending] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  function clearAvatarPreview() {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(null);
    setAvatarFile(null);
  }

  useEffect(() => () => {
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
  }, [avatarPreview]);

  function handleAvatarInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    setAvatarError(null);
    if (!file) return;
    if (!ALLOWED_AVATAR_TYPES.has(file.type as UploadAvatarInput["mimeType"])) {
      setAvatarError(t("profile.invalidImage"));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError(t("profile.imageTooLarge"));
      return;
    }
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function saveAvatar() {
    if (!avatarFile) return;
    setAvatarPending(true);
    setAvatarError(null);
    try {
      const result = await uploadUserAvatar({
        mimeType: avatarFile.type as UploadAvatarInput["mimeType"],
        data: await readFileAsDataUrl(avatarFile),
      });
      applyUserPatch(result.user);
      setProfile(result.profile);
      clearAvatarPreview();
      setActionSuccess(t("profile.avatarUpdated", "Profile photo updated"));
    } catch (err) {
      setAvatarError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setAvatarPending(false);
    }
  }

  async function handleRemoveAvatar() {
    setRemoveConfirmOpen(false);
    setAvatarPending(true);
    setAvatarError(null);
    try {
      const result = await removeUserAvatar();
      applyUserPatch(result.user);
      setProfile(result.profile);
      clearAvatarPreview();
      setActionSuccess(t("profile.avatarRemoved", "Profile photo removed"));
    } catch (err) {
      setAvatarError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setAvatarPending(false);
    }
  }

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState({
    current: false,
    next: false,
    confirm: false,
  });
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({});
  const [pwSubmitting, setPwSubmitting] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);
  const passwordStrength = getPasswordStrength(newPassword);

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pwSubmitting) return;
    const errors: Record<string, string> = {};
    if (!currentPassword) errors.currentPassword = t("profile.currentPasswordRequired");
    if (newPassword.length < 8) {
      errors.newPassword = t("profile.passwordTooShort");
    } else if (!/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
      errors.newPassword = t("profile.passwordNeedsLetterNumber");
    } else if (currentPassword === newPassword) {
      errors.newPassword = t("profile.passwordSameAsCurrent");
    }
    if (confirmPassword !== newPassword) errors.confirmPassword = t("profile.passwordMismatch");
    if (Object.keys(errors).length) {
      setPwErrors(errors);
      setPwError(null);
      return;
    }

    setPwSubmitting(true);
    setPwError(null);
    setPwErrors({});
    setPwSuccess(false);
    try {
      const result = await changeUserPassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      applySessionPayload({ ...result, token: result.token });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwSuccess(true);
      setActionSuccess(t("profile.passwordChanged"));
      window.setTimeout(() => setPwSuccess(false), 3500);
    } catch (err) {
      setPwError(mapTransactionUiError(err, t("form.submitFailed")));
    } finally {
      setPwSubmitting(false);
    }
  }

  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState({ browser: "—", os: "—", device: "—" });
  const [timezone, setTimezone] = useState("—");

  useEffect(() => {
    setDeviceInfo(getDeviceInfo());
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "—");
  }, []);

  const groupedPermissions = useMemo(() => {
    if (!profile) return [];
    const claimed = new Set<string>();
    const groups = PERMISSION_GROUPS.map((group) => {
      const permissions = profile.permissions.filter((key) => {
        const moduleName = key.split(".")[0] ?? "";
        if (!group.modules.includes(moduleName)) return false;
        claimed.add(key);
        return true;
      });
      return { ...group, permissions };
    }).filter((group) => group.permissions.length > 0);
    const other = profile.permissions.filter((key) => !claimed.has(key));
    if (other.length) {
      groups.push({ id: "other", modules: [], fallback: "Other", permissions: other });
    }
    return groups;
  }, [profile]);

  if (loading) {
    return (
      <ModuleLayout>
        <div className="space-y-6" role="status" aria-label={t("common.loading")}>
          <Skeleton className="h-56 w-full rounded-2xl" />
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
          <Skeleton className="h-72 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      </ModuleLayout>
    );
  }

  if (error || !profile) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState
          title={t("entityWorkspace.errorTitle")}
          description={error ?? t("profile.notFound")}
          onRetry={() => void loadProfile()}
        />
      </ModuleLayout>
    );
  }

  const roleNames = profile.roles.map((role) => role.name);
  const activityItems = [
    {
      id: "updated",
      title: t("profile.activity.profileUpdated", "Profile updated"),
      at: profile.updatedAt,
      icon: <Pencil className="h-3.5 w-3.5" aria-hidden />,
    },
    ...(profile.lastLoginAt
      ? [{
          id: "login",
          title: t("profile.activity.lastLogin", "Signed in"),
          at: profile.lastLoginAt,
          icon: <Laptop className="h-3.5 w-3.5" aria-hidden />,
        }]
      : []),
    {
      id: "created",
      title: t("profile.activity.accountCreated", "Account created"),
      at: profile.createdAt,
      icon: <UserRound className="h-3.5 w-3.5" aria-hidden />,
    },
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const strengthLabels = [
    t("profile.strength.none", "Enter a password"),
    t("profile.strength.weak", "Weak"),
    t("profile.strength.fair", "Fair"),
    t("profile.strength.good", "Good"),
    t("profile.strength.strong", "Strong"),
  ];

  return (
    <ModuleLayout>
      <ActionFeedback success={actionSuccess} error={avatarError} />

      <MasterDataWorkspace
        entityType="profile"
        entityId={profile.id}
        header={
          <section className="relative overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--card)] shadow-[var(--shadow-sm)]">
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-[var(--accent-muted)] via-[var(--muted-bg)] to-transparent opacity-80" />
            <div className="relative flex flex-col items-center gap-5 px-5 pb-7 pt-10 text-center sm:flex-row sm:items-end sm:px-8 sm:text-start">
              <div className="relative shrink-0">
                <div className="relative transition-transform duration-300 hover:scale-[1.02]">
                  <PersonAvatar
                    name={profile.name}
                    source={
                      avatarPreview
                        ? { kind: "static", src: avatarPreview }
                        : {
                            kind: "self-user",
                            hasAvatar: profile.hasAvatar,
                            avatarUpdatedAt: profile.avatarUpdatedAt,
                          }
                    }
                    size="xl"
                    lazy={false}
                    ring
                    presence={{
                      lastSeenAt: profile.lastSeenAt,
                      lastActiveAt: profile.lastActiveAt,
                    }}
                    editable={{
                      onPick: () => avatarInputRef.current?.click(),
                      busy: avatarPending,
                      ariaLabel: t("profile.changeAvatar"),
                    }}
                    className="h-28 w-28 text-2xl shadow-[var(--shadow-md)] sm:h-32 sm:w-32"
                  />
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarInputChange}
                  aria-label={t("profile.changeAvatar")}
                />
              </div>

              <div className="min-w-0 flex-1 pb-1">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <h1 className="max-w-full break-words text-2xl font-semibold tracking-tight sm:text-3xl">
                    {profile.name}
                  </h1>
                  <Badge variant={profile.isActive ? "success" : "secondary"}>
                    {profile.isActive ? t("profile.statusActive") : t("profile.statusInactive")}
                  </Badge>
                </div>
                <p className="ew-ltr-isolate mt-1 break-all text-sm text-[var(--muted)]">{profile.email}</p>
                <div className="mt-2 flex justify-center sm:justify-start">
                  <PresenceBadge
                    lastSeenAt={profile.lastSeenAt}
                    lastActiveAt={profile.lastActiveAt}
                    showLabel
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-[var(--muted)] sm:justify-start">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                    {roleNames.join(", ") || t("profile.noRoles")}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                    {profile.organization.name}
                  </span>
                </div>
                {avatarPreview ? (
                  <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                    <Button size="sm" loading={avatarPending} loadingText={t("form.saving", "Saving…")} onClick={() => void saveAvatar()}>
                      <Check className="h-3.5 w-3.5" aria-hidden />
                      {t("profile.saveAvatar", "Save photo")}
                    </Button>
                    <Button size="sm" variant="secondary" disabled={avatarPending} onClick={clearAvatarPreview}>
                      {t("form.cancel")}
                    </Button>
                  </div>
                ) : profile.hasAvatar ? (
                  <button
                    type="button"
                    className="ierp-focus-ring mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-0.5 text-xs text-[var(--muted)] transition-colors hover:text-[var(--destructive)]"
                    onClick={() => setRemoveConfirmOpen(true)}
                    disabled={avatarPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    {t("profile.removeAvatar")}
                  </button>
                ) : null}
              </div>

              <Button variant="secondary" className="shrink-0" onClick={openEditSheet}>
                <Pencil className="h-4 w-4" aria-hidden />
                {t("profile.edit")}
              </Button>
            </div>
          </section>
        }
        main={
          <div className="space-y-6">
            <div className="grid gap-6 xl:grid-cols-2">
              <ProfileSection
                id="personal"
                icon={<UserRound className="h-4 w-4" aria-hidden />}
                title={t("profile.personalInfo")}
                description={t("profile.personalInfoDesc", "The contact details shown across your workspace.")}
                action={
                  <Button size="sm" variant="ghost" onClick={openEditSheet}>
                    {t("profile.edit")}
                  </Button>
                }
              >
                <dl className="grid gap-1 sm:grid-cols-2">
                  <InfoItem label={t("masterData.name")} value={profile.name} />
                  <InfoItem label={t("profile.phone")} value={profile.phone ?? "—"} />
                  <InfoItem label={t("masterData.email")} value={profile.email} mono />
                  <InfoItem label={t("profile.jobTitle")} value={profile.jobTitle ?? "—"} />
                  <InfoItem
                    label={t("profile.language", "Language")}
                    value={locale === "ar" ? t("language.arabic", "Arabic") : t("language.english", "English")}
                    icon={<Globe2 className="h-3.5 w-3.5" aria-hidden />}
                  />
                  <InfoItem
                    label={t("profile.timezone", "Timezone")}
                    value={timezone}
                    icon={<Clock3 className="h-3.5 w-3.5" aria-hidden />}
                  />
                </dl>
              </ProfileSection>

              <ProfileSection
                id="account"
                icon={<ShieldCheck className="h-4 w-4" aria-hidden />}
                title={t("profile.accountInfo")}
                description={t("profile.accountReadOnly", "Managed by your organization and read-only.")}
              >
                <dl className="grid gap-1 sm:grid-cols-2">
                  <InfoItem label={t("profile.role")} value={roleNames.join(", ") || t("profile.noRoles")} />
                  <InfoItem label={t("profile.organization")} value={profile.organization.name} />
                  <InfoItem
                    label={t("profile.accountStatus")}
                    value={
                      <span className={profile.isActive ? "text-[var(--success)]" : "text-[var(--muted)]"}>
                        {profile.isActive ? t("profile.statusActive") : t("profile.statusInactive")}
                      </span>
                    }
                  />
                  <InfoItem label={t("common.created")} value={formatDisplayDateTime(profile.createdAt, locale)} />
                  <InfoItem label={t("entityWorkspace.updated")} value={formatDisplayDateTime(profile.updatedAt, locale)} />
                  <InfoItem label={t("profile.lastLogin")} value={formatDisplayDateTime(profile.lastLoginAt, locale)} />
                </dl>
              </ProfileSection>
            </div>

            <ProfileSection
              id="permissions"
              icon={<LockKeyhole className="h-4 w-4" aria-hidden />}
              title={t("profile.permissions")}
              description={t("profile.permissionsReadOnly", "Your access is assigned by administrators.")}
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setPermissionsOpen((open) => !open)}
                  aria-expanded={permissionsOpen}
                  aria-controls="permission-groups"
                >
                  {profile.permissions.length} {t("profile.permissions")}
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", permissionsOpen && "rotate-180")}
                    aria-hidden
                  />
                </Button>
              }
            >
              {!permissionsOpen ? (
                <div className="flex items-center gap-3 rounded-xl bg-[var(--muted-bg)]/50 px-4 py-3 text-sm text-[var(--muted)]">
                  <ShieldCheck className="h-5 w-5 text-[var(--accent)]" aria-hidden />
                  {t(
                    "profile.permissionsCollapsed",
                    "Expand to review permissions grouped by module."
                  )}
                </div>
              ) : (
                <div id="permission-groups" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {groupedPermissions.map((group) => (
                    <div key={group.id} className="rounded-xl border border-[var(--border-subtle)] p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h3 className="text-sm font-semibold">
                          {t(`profile.permissionGroup.${group.id}`, group.fallback)}
                        </h3>
                        <span className="text-xs tabular-nums text-[var(--muted)]">
                          {group.permissions.length}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {group.permissions.map((permission) => (
                          <li key={permission} className="flex items-start gap-2 text-xs text-[var(--muted)]">
                            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--success)]" aria-hidden />
                            <span className="capitalize">{permissionLabel(t, permission)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </ProfileSection>

            <ProfileSection
              id="security"
              icon={<KeyRound className="h-4 w-4" aria-hidden />}
              title={t("profile.security")}
              description={t("profile.changePasswordDescription")}
              className="overflow-hidden"
            >
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
                <form className="space-y-5" onSubmit={(event) => void handlePasswordSubmit(event)} noValidate>
                  <ActionFeedback error={pwError} />
                  {pwSuccess ? (
                    <div className="flex animate-pulse items-center gap-2 rounded-xl border border-[var(--success)]/25 bg-[var(--success)]/10 px-4 py-3 text-sm text-[var(--success)]">
                      <CheckCircle2 className="h-5 w-5" aria-hidden />
                      {t("profile.passwordChanged")}
                    </div>
                  ) : null}
                  <PasswordField
                    id="profile-current-password"
                    label={t("profile.currentPassword")}
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    visible={passwordVisible.current}
                    onToggle={() => setPasswordVisible((state) => ({ ...state, current: !state.current }))}
                    autoComplete="current-password"
                    error={pwErrors.currentPassword}
                    disabled={pwSubmitting}
                  />
                  <PasswordField
                    id="profile-new-password"
                    label={t("profile.newPassword")}
                    value={newPassword}
                    onChange={setNewPassword}
                    visible={passwordVisible.next}
                    onToggle={() => setPasswordVisible((state) => ({ ...state, next: !state.next }))}
                    autoComplete="new-password"
                    error={pwErrors.newPassword}
                    disabled={pwSubmitting}
                  />
                  <div>
                    <div className="flex gap-1.5" aria-hidden>
                      {[1, 2, 3, 4].map((level) => (
                        <span
                          key={level}
                          className={cn(
                            "h-1.5 flex-1 rounded-full bg-[var(--muted-bg)] transition-colors",
                            passwordStrength >= level &&
                              (passwordStrength <= 1
                                ? "bg-[var(--destructive)]"
                                : passwordStrength <= 2
                                  ? "bg-[var(--warning)]"
                                  : "bg-[var(--success)]")
                          )}
                        />
                      ))}
                    </div>
                    <p className="mt-1.5 text-xs text-[var(--muted)]" aria-live="polite">
                      {strengthLabels[passwordStrength]}
                    </p>
                  </div>
                  <PasswordField
                    id="profile-confirm-password"
                    label={t("profile.confirmPassword")}
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    visible={passwordVisible.confirm}
                    onToggle={() => setPasswordVisible((state) => ({ ...state, confirm: !state.confirm }))}
                    autoComplete="new-password"
                    error={pwErrors.confirmPassword}
                    disabled={pwSubmitting}
                  />
                  <div className="flex justify-end">
                    <Button type="submit" loading={pwSubmitting}>
                      <KeyRound className="h-4 w-4" aria-hidden />
                      {t("profile.changePassword")}
                    </Button>
                  </div>
                </form>

                <div className="space-y-3">
                  {[
                    {
                      id: "mfa",
                      title: t("profile.mfa", "Multi-factor authentication"),
                      description: t("profile.mfaDesc", "Add a second layer of account protection."),
                    },
                    {
                      id: "verification",
                      title: t("profile.loginVerification", "Login verification"),
                      description: t("profile.loginVerificationDesc", "Review unusual sign-in attempts."),
                    },
                  ].map((item) => (
                    <div key={item.id} className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--muted-bg)]/35 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">{item.title}</p>
                        <Badge variant="secondary">{t("nav.soon", "Coming soon")}</Badge>
                      </div>
                      <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted)]">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </ProfileSection>

            <div className="grid gap-6 xl:grid-cols-2">
              <ProfileSection
                id="preferences"
                icon={<Globe2 className="h-4 w-4" aria-hidden />}
                title={t("profile.preferences", "Preferences")}
                description={t("profile.preferencesDesc", "Your local workspace experience.")}
                action={
                  <Button asChild size="sm" variant="ghost">
                    <Link
                      href={
                        employeeSelfService
                          ? "/dashboard/my-workspace/settings"
                          : "/dashboard/settings/appearance"
                      }
                    >
                      {t("profile.managePreferences", "Manage")}
                    </Link>
                  </Button>
                }
              >
                <dl className="grid gap-1 sm:grid-cols-2">
                  <InfoItem
                    label={t("profile.language", "Language")}
                    value={locale === "ar" ? t("language.arabic", "Arabic") : t("language.english", "English")}
                  />
                  <InfoItem label={t("profile.timezone", "Timezone")} value={timezone} mono />
                </dl>
              </ProfileSection>

              <ProfileSection
                id="sessions"
                icon={<Laptop className="h-4 w-4" aria-hidden />}
                title={t("profile.activeSessions", "Active sessions")}
                description={t("profile.activeSessionsDesc", "Devices currently using your account.")}
              >
                <div className="rounded-xl border border-[var(--border-subtle)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)]">
                        {deviceInfo.device === "Mobile device" ? (
                          <Smartphone className="h-5 w-5" aria-hidden />
                        ) : (
                          <Laptop className="h-5 w-5" aria-hidden />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold">{t("profile.currentDevice", "Current device")}</p>
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          {deviceInfo.browser} · {deviceInfo.os}
                        </p>
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-[var(--muted)]">
                          <MapPin className="h-3.5 w-3.5" aria-hidden />
                          {timezone} · {t("profile.approximateLocation", "Approximate location")}
                        </p>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {t("profile.lastActiveNow", "Last active now")}
                        </p>
                      </div>
                    </div>
                    <Badge variant="success">{t("profile.current", "Current")}</Badge>
                  </div>
                </div>
                <Button className="mt-4 w-full" variant="secondary" disabled>
                  {t("profile.signOutOthers", "Sign out all other sessions")}
                  <span className="text-[10px]">({t("nav.soon", "Coming soon")})</span>
                </Button>
              </ProfileSection>
            </div>

            <ProfileSection
              id="activity"
              icon={<Activity className="h-4 w-4" aria-hidden />}
              title={t("profile.recentActivity", "Recent activity")}
              description={t("profile.recentActivityDesc", "Recent account events available to your profile.")}
            >
              <ol className="relative ms-2 border-s border-[var(--border)]">
                {activityItems.map((item, index) => (
                  <li key={item.id} className={cn("relative ms-6", index < activityItems.length - 1 && "pb-6")}>
                    <span className="absolute -start-[2.15rem] flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-[var(--accent)]">
                      {item.icon}
                    </span>
                    <p className="text-sm font-medium">{item.title}</p>
                    <time className="mt-1 block text-xs text-[var(--muted)]">
                      {formatDisplayDateTime(item.at, locale)}
                    </time>
                  </li>
                ))}
              </ol>
            </ProfileSection>
          </div>
        }
        footer={
          <EntityAudit
            meta={{
              id: profile.id,
              createdAt: profile.createdAt,
              updatedAt: profile.updatedAt,
              lastLoginAt: profile.lastLoginAt ?? undefined,
            }}
          />
        }
      />

      <Sheet open={editOpen} onOpenChange={handleEditOpenChange}>
        <SheetContent
          side={locale === "ar" ? "left" : "right"}
          className="w-full max-w-xl gap-0 p-0 sm:max-w-xl"
          onInteractOutside={(event) => {
            if (editSubmitting) event.preventDefault();
          }}
          onEscapeKeyDown={(event) => {
            if (editSubmitting) event.preventDefault();
          }}
        >
          <SheetHeader className="shrink-0 border-b border-[var(--border-subtle)] px-6 py-5 pe-14">
            <SheetTitle>{t("profile.edit")}</SheetTitle>
            <SheetDescription>{t("profile.editDescription")}</SheetDescription>
          </SheetHeader>
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => void handleEditSubmit(event)} noValidate>
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
              <ActionFeedback error={editError} />
              <div className="flex items-center gap-3 rounded-xl bg-[var(--muted-bg)]/50 p-4">
                <UserAvatar size="lg" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{profile.email}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {t("profile.emailReadOnly", "Email is managed by your organization.")}
                  </p>
                </div>
              </div>
              <FormField label={t("masterData.name")} htmlFor="profile-edit-name" required error={editErrors.name}>
                <input
                  id="profile-edit-name"
                  className={inputClassName}
                  value={editName}
                  onChange={(event) => setEditName(event.target.value)}
                  disabled={editSubmitting}
                  autoFocus
                  required
                />
              </FormField>
              <FormField label={t("profile.phone")} htmlFor="profile-edit-phone">
                <input
                  id="profile-edit-phone"
                  type="tel"
                  className={inputClassName}
                  value={editPhone}
                  onChange={(event) => setEditPhone(event.target.value)}
                  disabled={editSubmitting}
                />
              </FormField>
              {employeeSelfService ? (
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--muted-bg)]/40 px-4 py-3 text-xs text-[var(--muted)]">
                  <p className="font-medium text-[var(--foreground)]">
                    {t("profile.jobTitle")}
                    {profile?.jobTitle ? `: ${profile.jobTitle}` : ""}
                  </p>
                  <p className="mt-1">
                    {t(
                      "profile.jobTitleManagedByHr",
                      "Position and job title are managed by HR and cannot be changed here."
                    )}
                  </p>
                </div>
              ) : (
                <FormField label={t("profile.jobTitle")} htmlFor="profile-edit-job-title">
                  <input
                    id="profile-edit-job-title"
                    className={inputClassName}
                    value={editJobTitle}
                    onChange={(event) => setEditJobTitle(event.target.value)}
                    disabled={editSubmitting}
                  />
                </FormField>
              )}
              {editDirty ? (
                <div className="flex items-center gap-2 rounded-xl border border-[var(--warning)]/25 bg-[var(--warning)]/10 px-4 py-3 text-xs text-[var(--foreground)]">
                  <Sparkles className="h-4 w-4 text-[var(--warning)]" aria-hidden />
                  {t("profile.unsavedChanges", "You have unsaved changes.")}
                </div>
              ) : null}
            </div>
            <div className="sticky bottom-0 flex shrink-0 items-center justify-end gap-2 border-t border-[var(--border-subtle)] bg-[var(--card)]/95 px-6 py-4 backdrop-blur">
              <Button type="button" variant="secondary" disabled={editSubmitting} onClick={() => handleEditOpenChange(false)}>
                {t("form.cancel")}
              </Button>
              <Button type="submit" loading={editSubmitting} loadingText={t("form.saving", "Saving…")} disabled={!editDirty || editSubmitting}>
                {t("masterData.saveChanges")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Dialog open={discardConfirmOpen} onOpenChange={setDiscardConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("profile.discardTitle", "Discard changes?")}</DialogTitle>
            <DialogDescription>
              {t("profile.unsavedWarning", "Discard your unsaved changes?")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="secondary" onClick={() => setDiscardConfirmOpen(false)}>
              {t("profile.keepEditing", "Keep editing")}
            </Button>
            <Button type="button" variant="destructive" onClick={discardEditChanges}>
              {t("profile.discard", "Discard")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("profile.removeAvatarConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("profile.removeAvatarConfirmDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="secondary" onClick={() => setRemoveConfirmOpen(false)}>
              {t("form.cancel")}
            </Button>
            <Button type="button" variant="destructive" loading={avatarPending} onClick={() => void handleRemoveAvatar()}>
              {t("profile.removeAvatar")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
