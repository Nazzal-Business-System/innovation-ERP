"use client";

import { Settings2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { PremiumCard } from "@/components/motion/premium-card";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsNavLinks } from "@/components/settings/settings-gate";
import { PREFERENCE_LABELS } from "@/components/settings/settings-columns";
import { SettingsTableSkeleton } from "@/components/settings/settings-page-skeleton";
import { useSettingsPreferences } from "@/lib/hooks/use-settings";

export default function PreferencesPage() {
  const { data, loading, error, refetch } = useSettingsPreferences();

  if (loading && !data) {
    return (
      <ModuleLayout>
        <SettingsTableSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !data) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState title="Unable to load preferences" description={error ?? "No data"} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const byCategory = data.data.reduce<Record<string, typeof data.data>>((acc, pref) => {
    if (!acc[pref.category]) acc[pref.category] = [];
    acc[pref.category].push(pref);
    return acc;
  }, {});

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title="System Preferences"
          description="Localization, currency, and demo configuration."
          badge={<Badge variant="secondary">{data.data.length} settings</Badge>}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <SettingsNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="grid gap-6 lg:grid-cols-2">
          {Object.entries(byCategory).map(([category, prefs]) => (
            <PremiumCard key={category} className="overflow-hidden">
              <Card className="border-0 bg-transparent shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base capitalize">
                    <Settings2 className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                    {category}
                  </CardTitle>
                  <CardDescription>Read-only in demo environment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {prefs.map((pref) => (
                    <div key={pref.id} className="flex items-center justify-between rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
                      <span className="text-sm text-[var(--muted)]">{PREFERENCE_LABELS[pref.key] ?? pref.key}</span>
                      <span className="font-mono text-sm font-medium">{pref.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </PremiumCard>
          ))}
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
