"use client";

import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsNavLinks } from "@/components/settings/settings-gate";
import { ErrorState } from "@/components/feedback/error-state";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type NotificationPrefs = {
  inAppEnabled: boolean;
  emailEnabled: boolean;
};

type PreferencesResponse = {
  preferences: {
    notifications: NotificationPrefs;
  };
};

export default function NotificationPreferencesPage() {
  const { t } = useI18n();
  const [prefs, setPrefs] = useState<NotificationPrefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<PreferencesResponse>("/auth/preferences");
      setPrefs(res.preferences.notifications);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error.loadPreferences"));
      setPrefs(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function update(patch: Partial<NotificationPrefs>) {
    if (!prefs || saving) return;
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch<PreferencesResponse>("/auth/preferences", {
        method: "PATCH",
        body: JSON.stringify({ notifications: next }),
      });
      setPrefs(res.preferences.notifications);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error.saveFailed", "Unable to save"));
      void load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("settings.notifications.title", "Notification preferences")}
          description={t(
            "settings.notifications.description",
            "Choose how you receive in-app and email alerts."
          )}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <SettingsNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        {error && !prefs ? (
          <ErrorState
            title={t("error.loadPreferences")}
            description={error}
            onRetry={() => void load()}
          />
        ) : (
          <section className="rounded-2xl border border-[var(--border-subtle)] p-5">
            <div className="mb-4 flex items-center gap-2">
              <Bell className="h-4 w-4 text-[var(--accent)]" aria-hidden />
              <h3 className="text-sm font-semibold">
                {t("settings.notifications.channels", "Channels")}
              </h3>
              {loading ? (
                <Badge variant="secondary">{t("common.loading", "Loading…")}</Badge>
              ) : null}
              {saving ? (
                <Badge variant="secondary">{t("common.saving", "Saving…")}</Badge>
              ) : null}
            </div>

            {error ? (
              <p className="mb-3 text-sm text-[var(--destructive)]">{error}</p>
            ) : null}

            <div className="space-y-3">
              {(
                [
                  {
                    key: "inAppEnabled" as const,
                    label: t("settings.notifications.inApp", "In-app notifications"),
                    desc: t(
                      "settings.notifications.inAppDesc",
                      "Show alerts in the top-bar notification center."
                    ),
                  },
                  {
                    key: "emailEnabled" as const,
                    label: t("settings.notifications.email", "Email notifications"),
                    desc: t(
                      "settings.notifications.emailDesc",
                      "Receive email digests when email delivery is configured."
                    ),
                  },
                ] as const
              ).map((row) => {
                const enabled = prefs?.[row.key] !== false;
                return (
                  <div
                    key={row.key}
                    className={cn(
                      "flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    )}
                  >
                    <div>
                      <p className="text-sm font-medium">{row.label}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{row.desc}</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={enabled ? "default" : "outline"}
                      disabled={loading || saving || !prefs}
                      onClick={() => void update({ [row.key]: !enabled })}
                      aria-pressed={enabled}
                    >
                      {enabled
                        ? t("common.enabled", "Enabled")
                        : t("common.disabled", "Disabled")}
                    </Button>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </FadeIn>
    </ModuleLayout>
  );
}
