"use client";

import { Check, Languages } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleLayout } from "@/components/layout/module-layout";
import { SettingsNavLinks } from "@/components/settings/settings-gate";
import { useI18n } from "@/lib/i18n";
import type { Locale } from "@/lib/i18n/types";
import { cn } from "@/lib/utils";

const LOCALES: Array<{ code: Locale; labelKey: string; native: string; flag: string }> = [
  { code: "en", labelKey: "language.english", native: "English", flag: "🇬🇧" },
  { code: "ar", labelKey: "language.arabic", native: "العربية", flag: "🇯🇴" },
];

function LayoutPreview({ dir, label }: { dir: "ltr" | "rtl"; label: string }) {
  return (
    <div dir={dir} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] p-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">{label}</p>
      <div className="flex gap-2">
        <div className="h-16 w-4 shrink-0 rounded bg-[var(--muted-bg)]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-2 w-3/4 rounded bg-[var(--accent-muted)]" />
          <div className="h-2 w-full rounded bg-[var(--muted-bg)]" />
          <div className="h-2 w-5/6 rounded bg-[var(--muted-bg)]" />
          <div className="mt-2 h-6 w-16 rounded bg-[var(--accent)]/80" />
        </div>
      </div>
    </div>
  );
}

export default function LanguagePage() {
  const { t, locale, setLocale, dir } = useI18n();

  return (
    <ModuleLayout>
      <header className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--card)] p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--accent-muted)]">
            <Languages className="h-6 w-6 text-[var(--accent)]" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">{t("language.title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{t("language.description")}</p>
            <Badge variant="secondary" className="mt-3">
              {dir === "rtl" ? "RTL" : "LTR"}
            </Badge>
          </div>
        </div>
      </header>

      <SettingsNavLinks />

      <div className="grid gap-6 lg:grid-cols-2">
        {LOCALES.map((loc) => {
          const selected = locale === loc.code;
          const previewDir = loc.code === "ar" ? "rtl" : "ltr";
          return (
            <button
              key={loc.code}
              type="button"
              onClick={() => setLocale(loc.code)}
              className={cn(
                "ierp-focus-ring cursor-pointer rounded-xl border p-5 text-start transition-all",
                selected
                  ? "border-[var(--sidebar-active-border)] bg-[var(--accent-muted)]/40 shadow-[var(--shadow-md)] ring-1 ring-[var(--ring)]/20"
                  : "border-[var(--border-subtle)] bg-[var(--card)] hover:border-[var(--border)]"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl" aria-hidden>
                    {loc.flag}
                  </span>
                  <div>
                    <p className="text-lg font-semibold">{loc.native}</p>
                    <p className="text-sm text-[var(--muted)]">{t(loc.labelKey)}</p>
                  </div>
                </div>
                {selected && <Check className="h-5 w-5 shrink-0 text-[var(--accent)]" aria-hidden />}
              </div>
              <div className="mt-4">
                <LayoutPreview
                  dir={previewDir}
                  label={previewDir === "rtl" ? t("language.previewRtl") : t("language.previewLtr")}
                />
              </div>
              <p className="mt-3 text-xs text-[var(--muted)]">{t("language.sampleUi")}</p>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("language.beforeAfter")}</CardTitle>
          <CardDescription>{t("language.rtlNote")}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <LayoutPreview dir="ltr" label={t("language.previewLtr")} />
          <LayoutPreview dir="rtl" label={t("language.previewRtl")} />
        </CardContent>
      </Card>
    </ModuleLayout>
  );
}
