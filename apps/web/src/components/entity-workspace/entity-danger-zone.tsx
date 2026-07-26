"use client";

import type { ReactNode } from "react";
import { EntitySection } from "./entity-section";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function EntityDangerZone({
  description,
  children,
  className,
}: {
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  const { t } = useI18n();

  return (
    <EntitySection
      id="danger-zone"
      title={t("entityWorkspace.dangerZone")}
      description={description ?? t("entityWorkspace.dangerZoneDesc")}
      className={cn("border-[var(--destructive)]/30", className)}
    >
      <div className="flex flex-wrap gap-2">{children}</div>
    </EntitySection>
  );
}
