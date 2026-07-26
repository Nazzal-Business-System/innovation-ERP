"use client";

import type { ReactNode } from "react";
import { PersonAvatar } from "@/components/avatar/person-avatar";
import { Button } from "@/components/ui/button";
import { resolveLinkedUserPresence } from "@/lib/avatar/presence";
import { EntitySection } from "./entity-section";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function EntityOwner({
  name,
  role,
  userId,
  hasAvatar,
  avatarUpdatedAt,
  lastSeenAt,
  lastActiveAt,
  /** When true and no userId, treat as employee photo source. */
  employeeId,
  onReassign,
  reassignLabel,
  children,
  className,
  defaultOpen,
}: {
  name: string;
  role?: string;
  /** Linked user account — preferred for account avatars. */
  userId?: string | null;
  hasAvatar?: boolean;
  avatarUpdatedAt?: string | null;
  lastSeenAt?: string | null;
  lastActiveAt?: string | null;
  /** HR employee id when showing an employee (not a user account). */
  employeeId?: string | null;
  /** Simple reassign button when a custom control is not needed. */
  onReassign?: () => void;
  reassignLabel?: string;
  /** Custom reassignment UI (e.g. searchable AssigneeSelect). */
  children?: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const { t } = useI18n();
  const presence = resolveLinkedUserPresence({
    accountUserId: userId,
    lastSeenAt,
    lastActiveAt,
  });

  return (
    <EntitySection
      id="owner"
      title={t("entityWorkspace.owner")}
      className={className}
      defaultOpen={defaultOpen}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <PersonAvatar
            name={name}
            source={
              userId
                ? {
                    kind: "user",
                    userId,
                    hasAvatar: Boolean(hasAvatar),
                    avatarUpdatedAt,
                  }
                : employeeId
                  ? {
                      kind: "employee",
                      employeeId,
                      hasAvatar: Boolean(hasAvatar),
                      avatarUpdatedAt,
                    }
                  : { kind: "none" }
            }
            size="sm"
            presence={presence}
            noAccount={!userId && Boolean(employeeId)}
            lazy
          />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--foreground)]">{name}</p>
            {role ? <p className="text-xs text-[var(--muted)]">{role}</p> : null}
          </div>
        </div>
        {onReassign && !children ? (
          <Button type="button" size="sm" variant="outline" onClick={onReassign}>
            {reassignLabel ?? t("entityWorkspace.reassign")}
          </Button>
        ) : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </EntitySection>
  );
}

export function EntityWorkflow({
  statusLabel,
  steps,
  actions,
  className,
  defaultOpen,
}: {
  statusLabel: string;
  steps?: Array<{ id: string; label: string; active?: boolean; done?: boolean }>;
  actions?: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const { t } = useI18n();

  return (
    <EntitySection
      id="workflow"
      title={t("entityWorkspace.workflow")}
      className={className}
      defaultOpen={defaultOpen}
    >
      <p className="text-sm text-[var(--foreground)]">
        <span className="text-[var(--muted)]">{t("common.status")}: </span>
        {statusLabel}
      </p>
      {steps?.length ? (
        <ol className="mt-3 space-y-2" aria-label={t("entityWorkspace.workflow")}>
          {steps.map((step) => (
            <li
              key={step.id}
              className={cn(
                "rounded-md border px-3 py-2 text-xs",
                step.active
                  ? "border-[var(--accent)] bg-[var(--accent-muted)] text-[var(--accent)]"
                  : step.done
                    ? "border-[var(--border-subtle)] text-[var(--muted)]"
                    : "border-[var(--border-subtle)] text-[var(--muted)] opacity-70"
              )}
            >
              {step.label}
            </li>
          ))}
        </ol>
      ) : null}
      {actions ? <div className="mt-3 flex flex-wrap gap-2">{actions}</div> : null}
    </EntitySection>
  );
}
