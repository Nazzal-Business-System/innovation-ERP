import { Activity, HeartPulse } from "lucide-react";
import type { BusinessHealthMetric, HealthStatusLevel } from "@ierp/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumCard } from "@/components/motion/premium-card";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<
  HealthStatusLevel,
  { dot: string; badge: string; label: string }
> = {
  healthy: {
    dot: "bg-[var(--success)]",
    badge: "border-[var(--success)]/30 bg-[var(--success-bg)] text-[var(--success)]",
    label: "Healthy",
  },
  warning: {
    dot: "bg-[var(--warning)]",
    badge: "border-[var(--warning)]/30 bg-[var(--warning-bg)] text-[var(--warning)]",
    label: "Watch",
  },
  critical: {
    dot: "bg-[var(--destructive)]",
    badge: "border-[var(--destructive)]/30 bg-[var(--destructive-bg)] text-[var(--destructive)]",
    label: "Critical",
  },
  info: {
    dot: "bg-[var(--highlight)]",
    badge: "border-[var(--highlight)]/30 bg-[var(--highlight-muted)] text-[var(--highlight)]",
    label: "Stable",
  },
};

interface BusinessHealthSectionProps {
  metrics: BusinessHealthMetric[];
}

export function BusinessHealthSection({ metrics }: BusinessHealthSectionProps) {
  return (
    <PremiumCard className="overflow-hidden">
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="h-4 w-4 text-[var(--accent)]" aria-hidden />
            Business Health
          </CardTitle>
          <CardDescription>Real-time indicators across finance, inventory, and operations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              const style = STATUS_STYLES[metric.status];
              return (
                <div
                  key={metric.id}
                  className="ierp-card-hover rounded-xl border border-[var(--border-subtle)] bg-[var(--muted-bg)]/30 p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">
                      {metric.label}
                    </p>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-medium",
                        style.badge
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", style.dot)} aria-hidden />
                      {style.label}
                    </span>
                  </div>
                  <p className="mt-3 text-xl font-bold tracking-tight text-[var(--foreground)]">
                    {metric.value}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{metric.description}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)]/20 px-3 py-2">
            <Activity className="h-3.5 w-3.5 text-[var(--success)]" aria-hidden />
            <span className="text-xs text-[var(--muted)]">
              All core systems operational · Last synced just now
            </span>
          </div>
        </CardContent>
      </Card>
    </PremiumCard>
  );
}
