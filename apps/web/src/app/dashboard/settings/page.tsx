"use client";

import { ErrorState } from "@/components/feedback/error-state";
import { ModuleLayout } from "@/components/layout/module-layout";
import { SettingsOverviewView } from "@/components/settings/settings-overview-view";
import { SettingsPageSkeleton } from "@/components/settings/settings-page-skeleton";
import { useSettingsOverview } from "@/lib/hooks/use-settings";
import { useI18n } from "@/lib/i18n";

export default function SettingsOverviewPage() {
  const { t } = useI18n();
  const { data: overview, loading, error, refetch } = useSettingsOverview();

  if (loading) {
    return (
      <ModuleLayout>
        <SettingsPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error || !overview) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState title={t("error.loadSettings")} description={error ?? t("common.noData")} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  return <SettingsOverviewView overview={overview} />;
}
