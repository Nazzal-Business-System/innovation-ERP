"use client";

import { Building2, Calendar, Mail, Phone, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/data-display/status-badge";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { PremiumCard } from "@/components/motion/premium-card";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { SettingsNavLinks } from "@/components/settings/settings-gate";
import { SettingsTableSkeleton } from "@/components/settings/settings-page-skeleton";
import { useSettingsOrganization } from "@/lib/hooks/use-settings";

export default function OrganizationPage() {
  const { data, loading, error, refetch } = useSettingsOrganization();

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
        <ErrorState title="Unable to load organization" description={error ?? "No data"} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  const org = data.organization;

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title="Organization"
          description="Company profile and contact information."
          badge={<StatusBadge status={org.isActive ? "active" : "inactive"} label={org.isActive ? "Active" : "Inactive"} />}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <SettingsNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <PremiumCard className="overflow-hidden">
          <Card className="border-0 bg-transparent shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-[var(--accent)]" aria-hidden />
                Company Profile
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: Building2, label: "Company name", value: org.name },
                { icon: Tag, label: "Slug", value: org.slug, mono: true },
                { icon: Tag, label: "Industry", value: org.industry ?? "Not configured" },
                { icon: Mail, label: "Contact email", value: org.contactEmail ?? "Not configured" },
                { icon: Phone, label: "Contact phone", value: org.contactPhone ?? "Not configured" },
                { icon: Calendar, label: "Created", value: new Date(org.createdAt).toLocaleDateString() },
              ].map((field) => {
                const Icon = field.icon;
                return (
                  <div key={field.label} className="rounded-lg border border-[var(--border-subtle)] px-4 py-3">
                    <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {field.label}
                    </div>
                    <p className={`mt-1.5 text-sm font-medium ${field.mono ? "font-mono" : ""}`}>{field.value}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </PremiumCard>
      </FadeIn>
    </ModuleLayout>
  );
}
