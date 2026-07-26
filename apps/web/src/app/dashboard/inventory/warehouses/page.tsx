"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, MapPin, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/feedback/error-state";
import { FadeIn } from "@/components/motion/fade-in";
import { PremiumCard } from "@/components/motion/premium-card";
import { ModuleLayout } from "@/components/layout/module-layout";
import { PageHeader } from "@/components/layout/page-header";
import { InventoryNavLinks } from "@/components/inventory/inventory-gate";
import { InventoryPageSkeleton } from "@/components/inventory/inventory-page-skeleton";
import { useInventoryWarehouses } from "@/lib/hooks/use-inventory";
import { selectClassName } from "@/lib/form-utils";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export default function InventoryWarehousesPage() {
  const { t } = useI18n();
  const [activeFilter, setActiveFilter] = useState("true");
  const { data: warehouses, loading, error, refetch } = useInventoryWarehouses({
    active: activeFilter === "" ? undefined : activeFilter === "true",
  });

  if (loading) {
    return (
      <ModuleLayout>
        <InventoryPageSkeleton />
      </ModuleLayout>
    );
  }

  if (error) {
    return (
      <ModuleLayout maxWidth="lg">
        <ErrorState title="Unable to load warehouses" description={error} onRetry={() => void refetch()} />
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout>
      <FadeIn>
        <PageHeader
          title={t("nav.warehouses")}
          description="Distribution centers and branch storage locations for Al-Noor Trading."
          badge={<Badge variant="secondary">{warehouses?.length ?? 0} locations</Badge>}
        />
      </FadeIn>

      <FadeIn delay={0.04}>
        <InventoryNavLinks />
      </FadeIn>

      <FadeIn delay={0.06}>
        <div className="mb-4 flex justify-end">
          <select
            aria-label="Filter by lifecycle status"
            value={activeFilter}
            onChange={(event) => setActiveFilter(event.target.value)}
            className={cn(selectClassName, "min-w-[10rem]")}
          >
            <option value="true">Active only</option>
            <option value="false">Inactive only</option>
            <option value="">All warehouses</option>
          </select>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {warehouses?.map((wh) => (
            <Link
              key={wh.id}
              href={`/dashboard/inventory/warehouses/${wh.id}`}
              className="ierp-focus-ring block rounded-xl"
            >
              <PremiumCard glow className="overflow-hidden">
                <Card className="ierp-card-hover cursor-pointer border-0 bg-transparent shadow-none">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Building2 className="h-5 w-5 text-[var(--accent)]" aria-hidden />
                      {wh.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-1.5 text-sm">
                      <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      {wh.city} · {wh.branch}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {wh.code}
                      </Badge>
                      <Badge variant={wh.isActive ? "success" : "secondary"}>
                        {wh.isActive ? t("common.active") : t("masterData.inactive")}
                      </Badge>
                    </div>
                    {wh.address && (
                      <p className="text-sm leading-relaxed text-[var(--muted)]">{wh.address}</p>
                    )}
                    <div className="grid grid-cols-3 gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--muted-bg)]/40 p-4">
                      <div>
                        <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                          <Package className="h-3 w-3" aria-hidden />
                          {t("masterData.productCount")}
                        </p>
                        <p className="mt-1.5 text-xl font-bold tabular-nums">{wh.productCount ?? 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                          {t("masterData.totalUnits")}
                        </p>
                        <p className="mt-1.5 text-xl font-bold tabular-nums">
                          {wh.totalUnits?.toLocaleString() ?? 0}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                          {t("masterData.totalValue")}
                        </p>
                        <p className="mt-1.5 text-xl font-bold tabular-nums">{wh.totalValue ?? "—"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </PremiumCard>
            </Link>
          ))}
        </div>
      </FadeIn>
    </ModuleLayout>
  );
}
