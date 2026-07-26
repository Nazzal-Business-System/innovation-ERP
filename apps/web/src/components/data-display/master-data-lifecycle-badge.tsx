"use client";

import { StatusBadge } from "./status-badge";
import { useI18n } from "@/lib/i18n";

export function MasterDataLifecycleBadge({
  state,
}: {
  state: "active" | "archived" | "inactive" | "protected";
}) {
  const { t } = useI18n();
  if (state === "protected") {
    return <StatusBadge status="pending" label={t("masterData.protected")} />;
  }
  if (state === "archived") {
    return <StatusBadge status="inactive" label={t("masterData.archived")} />;
  }
  if (state === "inactive") {
    return <StatusBadge status="inactive" label={t("masterData.inactive")} />;
  }
  return <StatusBadge status="active" label={t("common.active")} />;
}
