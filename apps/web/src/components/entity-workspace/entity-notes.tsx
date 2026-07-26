"use client";

import type { ReactNode } from "react";
import type { EntityNoteItem } from "@/lib/entity-workspace/types";
import { EntitySection } from "./entity-section";
import { EntityEmptyState } from "./entity-empty-state";
import { useI18n } from "@/lib/i18n";

export function EntityNotes({
  notes,
  title,
  className,
  children,
  defaultOpen,
}: {
  /** Read-only note list when no custom editor (`children`) is provided. */
  notes?: EntityNoteItem[];
  title?: string;
  className?: string;
  /** Editable notes form or custom content (CRM opportunity draft editor, etc.). */
  children?: ReactNode;
  defaultOpen?: boolean;
}) {
  const { t } = useI18n();
  const list = notes ?? [];

  return (
    <EntitySection
      id="notes"
      title={title ?? t("entityWorkspace.notes")}
      className={className}
      defaultOpen={defaultOpen}
    >
      {children ? (
        children
      ) : !list.length ? (
        <EntityEmptyState variant="empty" title={t("entityWorkspace.noNotes")} />
      ) : (
        <ul className="space-y-3">
          {list.map((note) => (
            <li
              key={note.id}
              className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background)]/40 px-3 py-2"
            >
              <p className="whitespace-pre-wrap text-sm text-[var(--foreground)]">{note.body}</p>
              {(note.author || note.at) && (
                <p className="mt-2 text-[11px] text-[var(--muted)]">
                  {[note.author, note.at].filter(Boolean).join(" · ")}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </EntitySection>
  );
}
