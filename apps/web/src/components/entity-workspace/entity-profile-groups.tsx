"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useEntityLayout } from "./context/entity-layout-context";

export type EntityProfileRow = {
  id: string;
  label: string;
  value: ReactNode;
  /** Keep codes/IDs LTR in RTL layouts */
  mono?: boolean;
};

export type EntityProfileGroup = {
  id: string;
  title: string;
  rows: EntityProfileRow[];
};

/**
 * Compact grouped profile/summary composition.
 * Prefer this over EntityFieldGrid when values are simple label/value rows
 * that should not each sit in their own bordered card.
 */
export function EntityProfileGroups({
  groups,
  className,
}: {
  groups: EntityProfileGroup[];
  className?: string;
}) {
  const { layout } = useEntityLayout();
  const visible = groups.filter((g) => g.rows.length > 0);
  if (!visible.length) return null;

  const dense = layout === "compact" || layout === "focus";
  const executive = layout === "executive";

  return (
    <div
      className={cn(
        "ew-profile-groups",
        dense && "ew-profile-groups--dense",
        executive && "ew-profile-groups--executive",
        className
      )}
    >
      {visible.map((group) => (
        <section key={group.id} className="ew-profile-group min-w-0">
          <h3 className="ew-profile-group-title">{group.title}</h3>
          <dl className="ew-profile-group-rows">
            {group.rows.map((row) => (
              <div key={row.id} className="ew-profile-row min-w-0">
                <dt className="ew-profile-row-label">{row.label}</dt>
                <dd
                  className={cn(
                    "ew-profile-row-value",
                    row.mono && "ew-ltr-isolate font-mono text-xs"
                  )}
                  title={typeof row.value === "string" ? row.value : undefined}
                >
                  {row.value ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
