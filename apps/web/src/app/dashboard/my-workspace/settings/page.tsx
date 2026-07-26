"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Languages, LogOut, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { PresenceBadge } from "@/components/presence/presence-badge";
import { UserAvatar } from "@/components/auth/user-avatar";
import { apiFetch } from "@/lib/api-client";
import { useAppearanceStore } from "@/lib/appearance/store";
import { useAuthStore } from "@/lib/auth-store";
import { useI18n } from "@/lib/i18n";
import type { Locale, ThemeMode } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

function ThemePreview({ mode }: { mode: "light" | "dark" }) {
  const isLight = mode === "light";
  return (
    <div
      className={cn(
        "overflow-hidden rounded-lg border p-2",
        isLight ? "border-slate-200 bg-slate-50" : "border-slate-700 bg-slate-950"
      )}
    >
      <div className={cn("mb-2 h-2 w-8 rounded", isLight ? "bg-slate-200" : "bg-slate-800")} />
      <div className="grid grid-cols-3 gap-1">
        <div
          className={cn(
            "h-6 rounded",
            isLight ? "border border-slate-200 bg-white" : "border border-slate-700 bg-slate-900"
          )}
        />
        <div
          className={cn(
            "h-6 rounded",
            isLight ? "border border-slate-200 bg-white" : "border border-slate-700 bg-slate-900"
          )}
        />
        <div className={cn("h-6 rounded", isLight ? "bg-indigo-100" : "bg-indigo-500/30")} />
      </div>
    </div>
  );
}

const LOCALES: Array<{ code: Locale; native: string; labelKey: string }> = [
  { code: "en", native: "English", labelKey: "language.english" },
  { code: "ar", native: "العربية", labelKey: "language.arabic" },
];

type NotificationPrefs = { inAppEnabled: boolean; emailEnabled: boolean };

export default function MyWorkspaceSettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);
  const { theme, setTheme } = useAppearanceStore();
  const themeOptions: ThemeMode[] = ["dark", "light", "system"];
  const [notif, setNotif] = useState<NotificationPrefs | null>(null);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setNotifLoading(true);
      try {
        const res = await apiFetch<{ preferences: { notifications: NotificationPrefs } }>(
          "/auth/preferences"
        );
        if (!cancelled) setNotif(res.preferences.notifications);
      } catch {
        if (!cancelled) setNotif({ inAppEnabled: true, emailEnabled: true });
      } finally {
        if (!cancelled) setNotifLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    if (!hash) return;
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  async function updateNotif(patch: Partial<NotificationPrefs>) {
    if (!notif || notifSaving) return;
    const next = { ...notif, ...patch };
    setNotif(next);
    setNotifSaving(true);
    try {
      const res = await apiFetch<{ preferences: { notifications: NotificationPrefs } }>(
        "/auth/preferences",
        { method: "PATCH", body: JSON.stringify({ notifications: next }) }
      );
      setNotif(res.preferences.notifications);
    } catch {
      /* keep optimistic */
    } finally {
      setNotifSaving(false);
    }
  }

  function handleSignOut() {
    logout();
    router.replace("/login");
  }

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("selfService.settingsTitle", "My settings")}
          description={t(
            "selfService.settingsDesc",
            "Profile, appearance, language, notifications, and security."
          )}
        />
      </FadeIn>

      <FadeIn delay={0.02}>
        <section
          id="profile"
          className="flex flex-wrap items-center gap-4 rounded-2xl border border-[var(--border-subtle)] p-5"
        >
          <UserAvatar size="lg" showPresence />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{user?.name}</p>
            <p className="text-xs text-[var(--muted)]">{user?.email}</p>
            <div className="mt-1.5">
              <PresenceBadge
                lastSeenAt={user?.lastSeenAt}
                lastActiveAt={user?.lastActiveAt}
                showLabel
              />
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="ms-auto">
            <Link href="/dashboard/my-workspace/profile">
              {t("topbar.myProfile", "My Profile")}
            </Link>
          </Button>
        </section>
      </FadeIn>

      <FadeIn delay={0.04}>
        <section id="appearance" className="scroll-mt-24 rounded-2xl border border-[var(--border-subtle)] p-5">
          <h3 className="text-sm font-semibold">{t("appearance.theme", "Theme mode")}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {t("appearance.themeDesc", "Choose light, dark, or follow system preference.")}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {themeOptions.map((opt) => {
              const selected = theme === opt;
              const previewMode = opt === "light" ? "light" : "dark";
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setTheme(opt)}
                  className={cn(
                    "ierp-focus-ring cursor-pointer rounded-xl border p-3 text-start transition-all",
                    selected
                      ? "border-[var(--sidebar-active-border)] bg-[var(--accent-muted)] ring-1 ring-[var(--ring)]/20"
                      : "border-[var(--border-subtle)] hover:border-[var(--border)]"
                  )}
                >
                  {opt === "system" ? (
                    <div className="grid grid-cols-2 gap-1">
                      <ThemePreview mode="light" />
                      <ThemePreview mode="dark" />
                    </div>
                  ) : (
                    <ThemePreview mode={previewMode} />
                  )}
                  <p className="mt-2 flex items-center justify-between text-sm font-medium">
                    {t(`appearance.theme.${opt}`)}
                    {selected ? <Check className="h-4 w-4 text-[var(--accent)]" /> : null}
                  </p>
                </button>
              );
            })}
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={0.06}>
        <section id="language" className="scroll-mt-24 rounded-2xl border border-[var(--border-subtle)] p-5">
          <div className="mb-3 flex items-center gap-2">
            <Languages className="h-4 w-4 text-[var(--accent)]" aria-hidden />
            <h3 className="text-sm font-semibold">{t("language.title", "Language")}</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {LOCALES.map((loc) => {
              const selected = locale === loc.code;
              return (
                <button
                  key={loc.code}
                  type="button"
                  onClick={() => setLocale(loc.code)}
                  className={cn(
                    "ierp-focus-ring flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3 text-start transition-all",
                    selected
                      ? "border-[var(--sidebar-active-border)] bg-[var(--accent-muted)]/40 ring-1 ring-[var(--ring)]/20"
                      : "border-[var(--border-subtle)] hover:border-[var(--border)]"
                  )}
                >
                  <div>
                    <p className="font-medium">{loc.native}</p>
                    <p className="text-xs text-[var(--muted)]">{t(loc.labelKey)}</p>
                  </div>
                  {selected ? (
                    <Badge variant="secondary">
                      <Check className="me-1 h-3 w-3" />
                      {t("common.selected", "Selected")}
                    </Badge>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={0.08}>
        <section id="notifications" className="scroll-mt-24 rounded-2xl border border-[var(--border-subtle)] p-5">
          <div className="mb-3 flex items-center gap-2">
            <Bell className="h-4 w-4 text-[var(--accent)]" aria-hidden />
            <h3 className="text-sm font-semibold">
              {t("settings.notifications.title", "Notification preferences")}
            </h3>
            {notifLoading || notifSaving ? (
              <Badge variant="secondary">{t("common.loading", "Loading…")}</Badge>
            ) : null}
          </div>
          <div className="space-y-3">
            <div className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  {t("settings.notifications.inApp", "In-app notifications")}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={notif?.inAppEnabled !== false ? "default" : "outline"}
                disabled={notifLoading || notifSaving || !notif}
                onClick={() => void updateNotif({ inAppEnabled: !(notif?.inAppEnabled !== false) })}
              >
                {notif?.inAppEnabled !== false
                  ? t("common.enabled", "Enabled")
                  : t("common.disabled", "Disabled")}
              </Button>
            </div>
            <div className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium">
                  {t("settings.notifications.email", "Email notifications")}
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant={notif?.emailEnabled !== false ? "default" : "outline"}
                disabled={notifLoading || notifSaving || !notif}
                onClick={() => void updateNotif({ emailEnabled: !(notif?.emailEnabled !== false) })}
              >
                {notif?.emailEnabled !== false
                  ? t("common.enabled", "Enabled")
                  : t("common.disabled", "Disabled")}
              </Button>
            </div>
          </div>
        </section>
      </FadeIn>

      <FadeIn delay={0.1}>
        <section id="security" className="scroll-mt-24 rounded-2xl border border-[var(--border-subtle)] p-5">
          <Link
            href="/dashboard/profile"
            className="flex items-start gap-3 rounded-xl border border-[var(--border-subtle)] px-4 py-3 transition-colors hover:border-[var(--accent)]/35 hover:bg-[var(--accent)]/[0.03]"
          >
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden />
            <div>
              <p className="text-sm font-semibold">
                {t("selfService.securityLink", "Password & security")}
              </p>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                {t(
                  "selfService.securityLinkDesc",
                  "Manage your account password and sessions."
                )}
              </p>
            </div>
          </Link>
        </section>
      </FadeIn>

      <FadeIn delay={0.12}>
        <section className="rounded-2xl border border-[var(--border-subtle)] p-5">
          <Button type="button" variant="outline" className="gap-2" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            {t("nav.signOut", "Sign out")}
          </Button>
        </section>
      </FadeIn>
    </ModuleLayout>
  );
}
