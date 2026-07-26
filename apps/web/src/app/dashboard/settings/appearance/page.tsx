"use client";

import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ModuleLayout } from "@/components/layout/module-layout";
import { SettingsNavLinks } from "@/components/settings/settings-gate";
import { SidebarPreferencesCard } from "@/components/settings/sidebar-preferences-card";
import { useAppearanceStore } from "@/lib/appearance/store";
import { useI18n } from "@/lib/i18n";
import type { AccentColor, BorderRadius, CalendarStyle, Density, DetailsPageLayout, ThemeMode } from "@/lib/i18n/types";
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
        <div className={cn("h-6 rounded", isLight ? "bg-white border border-slate-200" : "bg-slate-900 border border-slate-700")} />
        <div className={cn("h-6 rounded", isLight ? "bg-white border border-slate-200" : "bg-slate-900 border border-slate-700")} />
        <div className={cn("h-6 rounded", isLight ? "bg-indigo-100" : "bg-indigo-500/30")} />
      </div>
      <div className={cn("mt-2 h-2 w-full rounded", isLight ? "bg-slate-200" : "bg-slate-800")} />
    </div>
  );
}

const ACCENT_SWATCH: Record<AccentColor, string> = {
  blue: "#3b82f6",
  indigo: "#6366f1",
  violet: "#8b5cf6",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
};

function CalendarPreview({ style }: { style: CalendarStyle }) {
  const dense = style === "compact";
  if (style === "system") {
    return (
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-2 py-2 font-mono text-[10px] text-[var(--muted)]">
        YYYY-MM-DD ▾
      </div>
    );
  }
  return (
    <div
      className={cn(
        "rounded-lg border border-[var(--border-subtle)] bg-[var(--background)]",
        dense ? "p-1.5" : "p-2"
      )}
    >
      <div className="mb-1 flex items-center justify-between text-[9px] font-semibold text-[var(--muted)]">
        <span>‹</span>
        <span>Mar 2026</span>
        <span>›</span>
      </div>
      <div className={cn("grid grid-cols-7 gap-0.5", dense ? "text-[8px]" : "text-[9px]")}>
        {Array.from({ length: 28 }, (_, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-center rounded",
              dense ? "h-3.5" : "h-4",
              i === 14 && "bg-[var(--accent)] text-[var(--accent-foreground)]",
              i === 19 && "ring-1 ring-[var(--accent)]/40"
            )}
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailsLayoutPreview({ layout }: { layout: DetailsPageLayout }) {
  const gap = layout === "compact" ? "gap-0.5" : layout === "executive" ? "gap-1.5" : "gap-1";
  const showSidebar = layout === "workspace" || layout === "compact";
  const centered = layout === "focus" || layout === "executive";

  return (
    <div className={cn("rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] p-2", gap)}>
      <div className={cn("h-1.5 rounded bg-[var(--muted-bg)]", centered ? "mx-auto w-3/5" : "w-4/5")} />
      <div
        className={cn(
          "grid",
          gap,
          showSidebar ? "grid-cols-[1fr_0.45fr]" : "grid-cols-1",
          centered && "mx-auto w-[85%]"
        )}
      >
        <div className="space-y-0.5">
          <div className={cn("rounded bg-[var(--card)] border border-[var(--border-subtle)]", layout === "executive" ? "h-5" : "h-3.5")} />
          <div className={cn("rounded bg-[var(--card)] border border-[var(--border-subtle)]", layout === "compact" ? "h-2.5" : "h-3")} />
          <div className="h-2 rounded bg-[var(--muted-bg)]" />
        </div>
        {showSidebar ? (
          <div className="space-y-0.5">
            <div className="h-3 rounded border border-[var(--border-subtle)] bg-[var(--accent-muted)]" />
            <div className="h-4 rounded border border-[var(--border-subtle)] bg-[var(--card)]" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function AppearancePage() {
  const { t } = useI18n();
  const {
    theme,
    accent,
    density,
    radius,
    calendarStyle,
    detailsPageLayout,
    setTheme,
    setAccent,
    setDensity,
    setRadius,
    setCalendarStyle,
    setDetailsPageLayout,
    reset,
  } = useAppearanceStore();

  const themeOptions: ThemeMode[] = ["dark", "light", "system"];
  const accentOptions: AccentColor[] = ["blue", "indigo", "violet", "emerald", "amber", "rose"];
  const densityOptions: Density[] = ["comfortable", "compact"];
  const radiusOptions: BorderRadius[] = ["soft", "medium", "sharp"];
  const calendarOptions: CalendarStyle[] = ["modern", "compact", "system"];
  const detailsLayoutOptions: DetailsPageLayout[] = ["workspace", "executive", "compact", "focus"];

  return (
    <ModuleLayout>
      <header className="rounded-[var(--radius-xl)] border border-[var(--border-subtle)] bg-[var(--card)] p-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]">
          {t("settings.nav.appearance")}
        </p>
        <h1 className="mt-2 text-2xl font-semibold">{t("appearance.title")}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">{t("appearance.description")}</p>
        <Button variant="outline" size="sm" className="mt-4 cursor-pointer" onClick={reset}>
          {t("common.reset")}
        </Button>
      </header>

      <SettingsNavLinks />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("appearance.theme")}</CardTitle>
              <CardDescription>{t("appearance.themeDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {themeOptions.map((opt) => {
                const selected = theme === opt;
                const previewMode = opt === "light" ? "light" : opt === "dark" ? "dark" : "dark";
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
                      {selected && <Check className="h-4 w-4 text-[var(--accent)]" />}
                    </p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("appearance.accent")}</CardTitle>
              <CardDescription>{t("appearance.accentDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 sm:grid-cols-6">
              {accentOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setAccent(opt)}
                  className={cn(
                    "ierp-focus-ring cursor-pointer rounded-xl border p-2 transition-all",
                    accent === opt ? "border-[var(--sidebar-active-border)] bg-[var(--accent-muted)]" : "border-[var(--border-subtle)]"
                  )}
                >
                  <div
                    className="mx-auto h-10 w-10 rounded-full border-2 border-white/20 shadow-md"
                    style={{ background: ACCENT_SWATCH[opt] }}
                  />
                  <p className="mt-2 text-center text-[10px] font-medium">{t(`appearance.accent.${opt}`)}</p>
                </button>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>{t("appearance.density")}</CardTitle>
                <CardDescription>{t("appearance.densityDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {densityOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDensity(opt)}
                    className={cn(
                      "cursor-pointer rounded-lg border p-3 text-start",
                      density === opt ? "border-[var(--accent)] bg-[var(--accent-muted)]" : "border-[var(--border-subtle)]"
                    )}
                  >
                    <div className={cn("space-y-1", opt === "compact" ? "gap-0.5" : "gap-1.5")}>
                      <div className="h-2 rounded bg-[var(--muted-bg)]" />
                      <div className="h-2 w-4/5 rounded bg-[var(--muted-bg)]" />
                      <div className="h-2 w-3/5 rounded bg-[var(--muted-bg)]" />
                    </div>
                    <p className="mt-2 text-xs font-medium">{t(`appearance.density.${opt}`)}</p>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t("appearance.radius")}</CardTitle>
                <CardDescription>{t("appearance.radiusDesc")}</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {radiusOptions.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setRadius(opt)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-lg border p-3",
                      radius === opt ? "border-[var(--accent)] bg-[var(--accent-muted)]" : "border-[var(--border-subtle)]"
                    )}
                  >
                    <div
                      className={cn(
                        "h-10 w-10 border-2 border-[var(--accent)] bg-[var(--accent-muted)]",
                        opt === "soft" && "rounded-xl",
                        opt === "medium" && "rounded-lg",
                        opt === "sharp" && "rounded-sm"
                      )}
                    />
                    <span className="text-sm font-medium">{t(`appearance.radius.${opt}`)}</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("appearance.calendarStyle")}</CardTitle>
              <CardDescription>{t("appearance.calendarStyleDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {calendarOptions.map((opt) => {
                const selected = calendarStyle === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setCalendarStyle(opt)}
                    className={cn(
                      "ierp-focus-ring cursor-pointer rounded-xl border p-3 text-start transition-all",
                      selected
                        ? "border-[var(--sidebar-active-border)] bg-[var(--accent-muted)] ring-1 ring-[var(--ring)]/20"
                        : "border-[var(--border-subtle)] hover:border-[var(--border)]"
                    )}
                  >
                    <CalendarPreview style={opt} />
                    <p className="mt-2 flex items-center justify-between text-sm font-medium">
                      {t(`appearance.calendarStyle.${opt}`)}
                      {selected && <Check className="h-4 w-4 text-[var(--accent)]" />}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {t(`appearance.calendarStyle.${opt}Desc`)}
                    </p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("appearance.detailsLayout")}</CardTitle>
              <CardDescription>{t("appearance.detailsLayoutDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {detailsLayoutOptions.map((opt) => {
                const selected = detailsPageLayout === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setDetailsPageLayout(opt)}
                    className={cn(
                      "ierp-focus-ring cursor-pointer rounded-xl border p-3 text-start transition-all",
                      selected
                        ? "border-[var(--sidebar-active-border)] bg-[var(--accent-muted)] ring-1 ring-[var(--ring)]/20"
                        : "border-[var(--border-subtle)] hover:border-[var(--border)]"
                    )}
                  >
                    <DetailsLayoutPreview layout={opt} />
                    <p className="mt-2 flex items-center justify-between text-sm font-medium">
                      {t(`appearance.detailsLayout.${opt}`)}
                      {selected && <Check className="h-4 w-4 text-[var(--accent)]" />}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {t(`appearance.detailsLayout.${opt}Desc`)}
                    </p>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          <SidebarPreferencesCard />
        </div>

        <Card className="h-fit xl:sticky xl:top-6">
          <CardHeader>
            <CardTitle>{t("appearance.preview")}</CardTitle>
            <CardDescription>{t("appearance.previewDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] p-4">
              <div className="mb-3 flex gap-2">
                <div className="h-8 w-8 rounded-lg bg-[var(--accent-muted)]" />
                <div className="flex-1 space-y-1">
                  <div className="h-2 w-20 rounded bg-[var(--muted-bg)]" />
                  <div className="h-2 w-28 rounded bg-[var(--muted-bg)]" />
                </div>
              </div>
              <Button size="sm" className="cursor-pointer">{t("common.save")}</Button>
              <Button size="sm" variant="secondary" className="ms-2 cursor-pointer">
                {t("common.apply")}
              </Button>
              <div className="mt-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--card)] p-3 text-xs text-[var(--muted)]">
                {t("settings.systemHealth")}
              </div>
              <div className="mt-3">
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                  {t("appearance.calendarStyle")}
                </p>
                <CalendarPreview style={calendarStyle} />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>{t("common.active")}</Badge>
              <Badge variant="outline">{theme}</Badge>
              <Badge variant="secondary">{accent}</Badge>
              <Badge variant="outline">{calendarStyle}</Badge>
              <Badge variant="outline">{detailsPageLayout}</Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
