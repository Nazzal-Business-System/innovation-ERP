"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildUserPresence,
  derivePresenceStatus,
  type PresenceStatus,
  type UserPresence,
} from "@ierp/shared";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const DOT_CLASS: Record<PresenceStatus, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-[var(--muted-foreground)]/55",
};

export function useDerivedPresence(input: {
  lastSeenAt?: string | null;
  lastActiveAt?: string | null;
  /** Tick to recompute relative labels without flicker storms. */
  refreshMs?: number;
}): { status: PresenceStatus; label: string; presence: UserPresence } {
  const [now, setNow] = useState(() => Date.now());
  const refreshMs = input.refreshMs ?? 30_000;

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), refreshMs);
    return () => window.clearInterval(id);
  }, [refreshMs]);

  return useMemo(() => {
    const date = new Date(now);
    const presence = buildUserPresence(
      "local",
      { lastSeenAt: input.lastSeenAt, lastActiveAt: input.lastActiveAt },
      date
    );
    return { status: presence.status, label: presence.label, presence };
  }, [input.lastSeenAt, input.lastActiveAt, now]);
}

export function PresenceDot({
  status,
  className,
  size = "sm",
}: {
  status: PresenceStatus | "unknown";
  className?: string;
  size?: "sm" | "md";
}) {
  const isUnknown = status === "unknown";
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full ring-2 ring-[var(--card)]",
        size === "md" ? "h-3 w-3" : "h-2.5 w-2.5",
        isUnknown ? "bg-[var(--muted-foreground)]/35" : DOT_CLASS[status],
        className
      )}
      aria-hidden
    />
  );
}

export function PresenceBadge({
  lastSeenAt,
  lastActiveAt,
  status: statusOverride,
  className,
  showLabel = false,
  size = "sm",
}: {
  lastSeenAt?: string | null;
  lastActiveAt?: string | null;
  status?: PresenceStatus | "unknown";
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md";
}) {
  const { t } = useI18n();
  const derived = useDerivedPresence({ lastSeenAt, lastActiveAt });
  const status: PresenceStatus | "unknown" = statusOverride ?? derived.status;

  const label =
    status === "unknown"
      ? t("presence.unknown", "Unknown")
      : status === "online"
        ? t("presence.online", "Online")
        : status === "away"
          ? t("presence.away", "Away")
          : derived.status === "offline" && lastSeenAt
            ? localizeLastSeen(derived.label, t)
            : t("presence.offline", "Offline");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn("inline-flex items-center gap-1.5", className)}
          aria-label={label}
        >
          <PresenceDot status={status} size={size} />
          {showLabel ? (
            <span className="text-xs text-[var(--muted)]">{label}</span>
          ) : (
            <span className="sr-only">{label}</span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}


function localizeLastSeen(
  englishFallback: string,
  t: (key: string, fallback?: string) => string
): string {
  const mins = englishFallback.match(/Last seen (\d+)m ago/);
  if (mins) {
    return t("presence.lastSeenMinutes", "Last seen {n}m ago").replace("{n}", mins[1]);
  }
  const hours = englishFallback.match(/Last seen (\d+)h ago/);
  if (hours) {
    return t("presence.lastSeenHours", "Last seen {n}h ago").replace("{n}", hours[1]);
  }
  return t("presence.offline", "Offline");
}

export function presenceStatusFromTimestamps(
  lastSeenAt?: string | null,
  lastActiveAt?: string | null
): PresenceStatus {
  return derivePresenceStatus({ lastSeenAt, lastActiveAt });
}
