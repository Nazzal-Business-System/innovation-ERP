"use client";

import type { ReactNode } from "react";
import { EntitySection } from "./entity-section";
import { EntityEmptyState } from "./entity-empty-state";
import { useI18n } from "@/lib/i18n";

export function EntityAttachments({
  children,
  empty = true,
  title,
  description,
  className,
}: {
  children?: ReactNode;
  empty?: boolean;
  title?: string;
  /** Override empty-state description (e.g. honest “coming later”). */
  description?: string;
  className?: string;
}) {
  const { t } = useI18n();

  return (
    <EntitySection
      id="attachments"
      title={title ?? t("entityWorkspace.attachments")}
      className={className}
    >
      {empty && !children ? (
        <EntityEmptyState
          variant="placeholder"
          title={t("entityWorkspace.noAttachments")}
          description={description ?? t("entityWorkspace.noAttachmentsDesc")}
        />
      ) : (
        children
      )}
    </EntitySection>
  );
}
