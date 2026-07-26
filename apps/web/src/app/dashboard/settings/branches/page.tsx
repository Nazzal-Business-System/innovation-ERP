"use client";

import { Building2, MapPin, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { PremiumCard } from "@/components/motion/premium-card";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsNavLinks } from "@/components/settings/settings-gate";
import { SettingsTableSkeleton } from "@/components/settings/settings-page-skeleton";
import { useSettingsBranches } from "@/lib/hooks/use-settings";

export default function BranchesPage() {
  const { data, loading, error, refetch } = useSettingsBranches();

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
        <ErrorState title="Unable to load branches" description={error ?? "No data"} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title="Branches"
          description="Physical locations and regional offices."
          badge={<Badge variant="secondary">{data.data.length} branches</Badge>}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <SettingsNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="grid gap-4 sm:grid-cols-2">
          {data.data.map((branch) => (
            <PremiumCard key={branch.id} className="overflow-hidden">
              <Card className="border-0 bg-transparent shadow-none">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Building2 className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                      {branch.name}
                    </CardTitle>
                    <StatusBadge status={branch.isActive ? "active" : "inactive"} label={branch.isActive ? "Active" : "Inactive"} />
                  </div>
                  <CardDescription className="font-mono">{branch.code}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-start gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
                    <div>
                      <p className="font-medium">{branch.city}</p>
                      <p className="text-[var(--muted)]">{branch.address}</p>
                    </div>
                  </div>
                  {branch.phone && (
                    <div className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
                      <Phone className="h-4 w-4 text-[var(--muted)]" aria-hidden />
                      <span>{branch.phone}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </PremiumCard>
          ))}
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
