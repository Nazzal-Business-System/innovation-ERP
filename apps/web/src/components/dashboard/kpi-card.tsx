import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  title: string;
  value: string;
  change?: string;
  trend?: "up" | "down" | "neutral";
  icon?: LucideIcon;
  className?: string;
}

export function KpiCard({ title, value, change, trend = "neutral", icon: Icon, className }: KpiCardProps) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;

  return (
    <div className={cn("ierp-kpi-card", className)}>
      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 ps-1">
            <p className="text-xs font-medium text-[var(--muted-foreground)]">{title}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[var(--foreground)]">
              {value}
            </p>
            {change && (
              <p
                className={cn(
                  "mt-2 flex items-center gap-1 text-xs font-medium",
                  trend === "up" && "text-[var(--success)]",
                  trend === "down" && "text-[var(--destructive)]",
                  trend === "neutral" && "text-[var(--muted)]"
                )}
              >
                {TrendIcon && <TrendIcon className="h-3.5 w-3.5" aria-hidden />}
                {change}
              </p>
            )}
          </div>
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)]/60">
              <Icon className="h-5 w-5 text-[var(--accent)]" aria-hidden />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
