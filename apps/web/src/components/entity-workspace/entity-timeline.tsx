"use client";

import type { EntityTimelineEvent } from "@/lib/entity-workspace/types";
import { EntitySection } from "./entity-section";
import { EntityEmptyState } from "./entity-empty-state";
import { useI18n } from "@/lib/i18n";

export function EntityTimeline({
  events,
  title,
  className,
}: {
  events: EntityTimelineEvent[];
  title?: string;
  className?: string;
}) {
  const { t } = useI18n();

  return (
    <EntitySection
      id="timeline"
      title={title ?? t("entityWorkspace.timeline")}
      className={className}
    >
      {!events.length ? (
        <EntityEmptyState variant="empty" title={t("entityWorkspace.noTimeline")} />
      ) : (
        <ol className="relative space-y-4 border-s border-[var(--border-subtle)] ps-4">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span
                className="absolute -start-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--accent)] bg-[var(--card)]"
                aria-hidden
              />
              <p className="text-sm font-medium text-[var(--foreground)]">{event.title}</p>
              {event.description ? (
                <p className="mt-0.5 text-xs text-[var(--muted)]">{event.description}</p>
              ) : null}
              <p className="mt-1 text-[11px] text-[var(--muted)]">
                <span className="ew-ltr-isolate">{event.at}</span>
                {event.actor ? ` · ${event.actor}` : null}
              </p>
            </li>
          ))}
        </ol>
      )}
    </EntitySection>
  );
}
