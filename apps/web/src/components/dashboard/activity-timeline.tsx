import {
  DollarSign,
  Package,
  Settings,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ActivityCategory, ActivityTimelineItem } from "@ierp/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumCard } from "@/components/motion/premium-card";
import { StatusBadge } from "@/components/data-display/status-badge";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<ActivityCategory, LucideIcon> = {
  finance: DollarSign,
  inventory: Package,
  sales: ShoppingCart,
  hr: Users,
  operations: Settings,
};

const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  finance: "text-[var(--success)] bg-[var(--success-bg)]",
  inventory: "text-[var(--highlight)] bg-[var(--highlight-muted)]",
  sales: "text-[var(--accent)] bg-[var(--accent-muted)]",
  hr: "text-[var(--info)] bg-[var(--info-bg)]",
  operations: "text-[var(--warning)] bg-[var(--warning-bg)]",
};

interface ActivityTimelineProps {
  items: ActivityTimelineItem[];
  title?: string;
  description?: string;
}

export function ActivityTimeline({
  items,
  title = "Activity Timeline",
  description = "Latest events across finance, operations, and HR",
}: ActivityTimelineProps) {
  return (
    <PremiumCard className="overflow-hidden">
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="relative space-y-0">
            {items.map((item, index) => {
              const Icon = CATEGORY_ICONS[item.category];
              const isLast = index === items.length - 1;
              return (
                <li key={item.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {!isLast && (
                    <span
                      className="absolute left-[17px] top-9 h-[calc(100%-12px)] w-px bg-[var(--border-subtle)]"
                      aria-hidden
                    />
                  )}
                  <div
                    className={cn(
                      "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)]",
                      CATEGORY_COLORS[item.category]
                    )}
                  >
                    <Icon className="h-4 w-4" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-medium text-[var(--foreground)]">{item.title}</p>
                      <span className="shrink-0 text-xs text-[var(--muted-foreground)]">{item.time}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{item.description}</p>
                    {item.status && (
                      <div className="mt-2">
                        <StatusBadge status={item.status} label={item.status} />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </PremiumCard>
  );
}
