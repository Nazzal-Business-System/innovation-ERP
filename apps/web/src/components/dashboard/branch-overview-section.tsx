import { Building2, Package, ShoppingCart } from "lucide-react";
import type { BranchOverview } from "@ierp/shared";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PremiumCard } from "@/components/motion/premium-card";
import { cn } from "@/lib/utils";

interface BranchOverviewSectionProps {
  branches: BranchOverview[];
}

export function BranchOverviewSection({ branches }: BranchOverviewSectionProps) {
  return (
    <PremiumCard glow className="overflow-hidden">
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-4 w-4 text-[var(--highlight)]" aria-hidden />
            Branch Overview
          </CardTitle>
          <CardDescription>Performance snapshot by location</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {branches.map((branch, index) => (
              <div
                key={branch.id}
                className={cn(
                  "rounded-xl border border-[var(--border-subtle)] bg-[var(--muted-bg)]/30 p-5",
                  index === 0 && "ring-1 ring-[var(--accent)]/20"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-[var(--foreground)]">{branch.name}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                      {branch.revenueShare}% of total revenue
                    </p>
                  </div>
                  {index === 0 && (
                    <span className="rounded-md border border-[var(--accent)]/30 bg-[var(--accent-muted)] px-2 py-0.5 text-[10px] font-medium text-[var(--accent)]">
                      Top branch
                    </span>
                  )}
                </div>

                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--muted-bg)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--gradient-from)] to-[var(--gradient-to)]"
                    style={{ width: `${branch.revenueShare}%` }}
                  />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div>
                    <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
                      <ShoppingCart className="h-3 w-3" aria-hidden />
                      Revenue
                    </p>
                    <p className="mt-1 text-sm font-semibold">{branch.revenue}</p>
                  </div>
                  <div>
                    <p className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
                      <Package className="h-3 w-3" aria-hidden />
                      Orders
                    </p>
                    <p className="mt-1 text-sm font-semibold">{branch.orders}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wide text-[var(--muted-foreground)]">
                      Inventory
                    </p>
                    <p className="mt-1 text-sm font-semibold">{branch.inventoryValue}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </PremiumCard>
  );
}
