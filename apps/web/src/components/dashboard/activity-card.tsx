import { Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumCard } from "@/components/motion/premium-card";
import { StatusBadge } from "@/components/data-display/status-badge";
import { cn } from "@/lib/utils";

export interface ActivityItem {
  id: string;
  title: string;
  description?: string;
  time: string;
  status?: "active" | "pending" | "info" | "draft";
}

interface ActivityCardProps {
  title?: string;
  description?: string;
  items: ActivityItem[];
  className?: string;
}

export function ActivityCard({
  title = "Recent activity",
  description = "Latest business events",
  items,
  className,
}: ActivityCardProps) {
  return (
    <PremiumCard className={cn("overflow-hidden", className)}>
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4 text-[var(--highlight)]" aria-hidden />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-4 last:border-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)]">{item.title}</p>
                  {item.description && (
                    <p className="mt-0.5 text-xs text-[var(--muted)]">{item.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <span className="text-xs text-[var(--muted-foreground)]">{item.time}</span>
                  {item.status && <StatusBadge status={item.status} label={item.status} />}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PremiumCard>
  );
}
