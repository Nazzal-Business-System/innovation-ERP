"use client";

import Link from "next/link";
import type { EntityRelationItem } from "@/lib/entity-workspace/types";
import { EntitySection } from "./entity-section";
import { EntityEmptyState } from "./entity-empty-state";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function EntityRelations({
  items,
  title,
  className,
  emptyTitle,
  emptyDescription,
}: {
  items: EntityRelationItem[];
  title?: string;
  className?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const { t } = useI18n();
  const heading = title ?? t("entityWorkspace.related");

  return (
    <EntitySection id="relations" title={heading} className={className}>
      {!items.length ? (
        <EntityEmptyState
          variant="empty"
          title={emptyTitle ?? t("entityWorkspace.noRelated")}
          description={
            emptyDescription === ""
              ? undefined
              : (emptyDescription ?? t("entityWorkspace.noRelatedDesc"))
          }
        />
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const content = (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-[var(--foreground)]">{item.label}</p>
                {item.description ? (
                  <p className="truncate text-xs text-[var(--muted)]">{item.description}</p>
                ) : null}
                {item.meta ? (
                  <p className="ew-ltr-isolate mt-0.5 font-mono text-[10px] text-[var(--muted)]">
                    {item.meta}
                  </p>
                ) : null}
              </div>
            );
            return (
              <li key={item.id}>
                {item.href ? (
                  <Link
                    href={item.href}
                    className={cn(
                      "ierp-focus-ring block rounded-lg border border-[var(--border-subtle)] px-3 py-2",
                      "hover:border-[var(--border)] hover:bg-[var(--muted-bg)]"
                    )}
                  >
                    {content}
                  </Link>
                ) : (
                  <div className="rounded-lg border border-[var(--border-subtle)] px-3 py-2">
                    {content}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </EntitySection>
  );
}
