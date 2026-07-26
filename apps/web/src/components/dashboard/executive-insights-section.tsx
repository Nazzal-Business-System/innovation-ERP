import { Sparkles } from "lucide-react";
import type { ExecutiveInsight, InsightType } from "@ierp/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumCard } from "@/components/motion/premium-card";
import { cn } from "@/lib/utils";

const INSIGHT_STYLES: Record<InsightType, string> = {
  positive: "border-[var(--success)]/20 bg-[var(--success-bg)]/40",
  neutral: "border-[var(--border-subtle)] bg-[var(--muted-bg)]/30",
  attention: "border-[var(--warning)]/25 bg-[var(--warning-bg)]/30",
};

const INSIGHT_DOT: Record<InsightType, string> = {
  positive: "bg-[var(--success)]",
  neutral: "bg-[var(--muted-foreground)]",
  attention: "bg-[var(--warning)]",
};

interface ExecutiveInsightsSectionProps {
  insights: ExecutiveInsight[];
}

export function ExecutiveInsightsSection({ insights }: ExecutiveInsightsSectionProps) {
  return (
    <PremiumCard glow className="overflow-hidden">
      <Card className="border-0 bg-gradient-to-br from-[var(--accent-muted)]/15 via-transparent to-[var(--highlight-muted)]/10 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-[var(--highlight)]" aria-hidden />
            Executive Insights
          </CardTitle>
          <CardDescription>AI-style signals derived from your operational data</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 sm:grid-cols-2">
            {insights.map((insight) => (
              <li
                key={insight.id}
                className={cn(
                  "rounded-xl border p-4 transition-colors duration-200",
                  INSIGHT_STYLES[insight.type]
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", INSIGHT_DOT[insight.type])}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                      {insight.category}
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--foreground)]/90">
                      {insight.message}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </PremiumCard>
  );
}
