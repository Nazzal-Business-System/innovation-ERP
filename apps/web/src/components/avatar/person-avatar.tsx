"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PresenceBadge } from "@/components/presence/presence-badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  acquireAvatarObjectUrl,
  releaseAvatarObjectUrl,
} from "@/lib/avatar/fetch-cache";
import {
  AVATAR_CAMERA_CLASS,
  AVATAR_PRESENCE_SIZE,
  AVATAR_SIZE_CLASS,
  initialsFromDisplayName,
  type AvatarSize,
} from "@/lib/avatar/sizes";
import type { PresenceStatus } from "@ierp/shared";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type PersonAvatarSource =
  | { kind: "self-user"; hasAvatar?: boolean; avatarUpdatedAt?: string | null }
  | { kind: "user"; userId: string; hasAvatar?: boolean; avatarUpdatedAt?: string | null }
  | {
      kind: "employee";
      employeeId: string;
      hasAvatar?: boolean;
      avatarUpdatedAt?: string | null;
    }
  | { kind: "self-employee"; hasAvatar?: boolean; avatarUpdatedAt?: string | null }
  | { kind: "static"; src: string | null }
  | { kind: "none" };

export type PersonAvatarPresence =
  | {
      lastSeenAt?: string | null;
      lastActiveAt?: string | null;
      status?: PresenceStatus | "unknown";
    }
  | false
  | null
  | undefined;

export type PersonAvatarObjectPosition = "center" | "center top" | "center bottom";

/**
 * Shared circular person avatar (PresenceAvatar).
 *
 * Layout (logical, RTL-safe):
 * - Camera / edit control → bottom-start
 * - Presence dot → bottom-end
 * Never overlap those two controls.
 *
 * Image fills the clipping circle (object-cover). Decorative rings sit outside
 * the overflow-hidden wrapper so they never shrink the photo.
 */
export function PersonAvatar({
  name,
  source,
  size = "md",
  presence,
  noAccount = false,
  editable,
  className,
  fallbackClassName,
  ring = false,
  lazy = true,
  alt,
  objectPosition = "center top",
}: {
  name: string;
  source: PersonAvatarSource;
  size?: AvatarSize;
  /** Omit / false / null → no presence indicator (e.g. employee without account). */
  presence?: PersonAvatarPresence;
  /** Subtle accessible “No account” state when there is no linked User. */
  noAccount?: boolean;
  editable?: {
    onPick: () => void;
    busy?: boolean;
    ariaLabel?: string;
  } | null;
  className?: string;
  fallbackClassName?: string;
  /** Decorative ring outside the image clip — does not inset the photo. */
  ring?: boolean;
  /** IntersectionObserver lazy-load for list rows. Current-user avatars can set false. */
  lazy?: boolean;
  alt?: string;
  objectPosition?: PersonAvatarObjectPosition;
}) {
  const { t } = useI18n();
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const [visible, setVisible] = useState(!lazy);
  const [src, setSrc] = useState<string | null>(
    source.kind === "static" ? source.src : null
  );
  const [broken, setBroken] = useState(false);

  useEffect(() => {
    if (!lazy) {
      setVisible(true);
      return;
    }
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "120px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [lazy]);

  useEffect(() => {
    if (source.kind === "static") {
      setSrc(source.src);
      setBroken(false);
      return;
    }
    if (source.kind === "none" || !visible) {
      setSrc(null);
      return;
    }

    const hasAvatar =
      source.kind === "self-user" ||
      source.kind === "self-employee" ||
      source.kind === "user" ||
      source.kind === "employee"
        ? Boolean(source.hasAvatar)
        : false;

    if (!hasAvatar) {
      setSrc(null);
      return;
    }

    let cancelled = false;
    const kind = source.kind;
    const id =
      source.kind === "user"
        ? source.userId
        : source.kind === "employee"
          ? source.employeeId
          : "me";
    const version =
      "avatarUpdatedAt" in source ? (source.avatarUpdatedAt ?? null) : null;

    void acquireAvatarObjectUrl({ kind, id, version }).then((url) => {
      if (cancelled) {
        if (url) releaseAvatarObjectUrl({ kind, id, version });
        return;
      }
      setBroken(false);
      setSrc(url);
    });

    return () => {
      cancelled = true;
      releaseAvatarObjectUrl({ kind, id, version });
    };
  }, [source, visible]);

  const showPresence = Boolean(presence) && presence !== false;
  const presenceProps =
    showPresence && presence && typeof presence === "object" ? presence : null;

  const objectPositionClass =
    objectPosition === "center"
      ? "object-center"
      : objectPosition === "center bottom"
        ? "object-[center_bottom]"
        : "object-[center_top]";

  const avatar = (
    <span
      ref={rootRef}
      className={cn("relative inline-flex shrink-0", AVATAR_SIZE_CLASS[size], className)}
      data-avatar-size={size}
    >
      {/* Clipping circle — image fills 100%; no inner padding / nested smaller circle */}
      <Avatar
        className={cn(
          "relative !h-full !w-full overflow-hidden rounded-full",
          "aspect-square"
        )}
      >
        {src && !broken ? (
          <AvatarImage
            src={src}
            alt={alt ?? name}
            className={cn("absolute inset-0 h-full w-full object-cover", objectPositionClass)}
            onError={() => setBroken(true)}
          />
        ) : null}
        <AvatarFallback
          className={cn(
            "border border-[var(--border-subtle)] bg-[var(--card)] font-semibold text-[var(--accent)]",
            fallbackClassName
          )}
        >
          {initialsFromDisplayName(name)}
        </AvatarFallback>
      </Avatar>

      {/* Decorative ring outside the clip so it never shrinks the photo */}
      {ring ? (
        <span
          className="pointer-events-none absolute -inset-0.5 rounded-full ring-2 ring-[var(--card)]"
          aria-hidden
        />
      ) : null}

      {editable ? (
        <button
          type="button"
          className={cn(
            "ierp-focus-ring absolute -bottom-0.5 -start-0.5 z-20 flex cursor-pointer items-center justify-center rounded-full",
            "border-2 border-[var(--card)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm",
            "transition hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60",
            AVATAR_CAMERA_CLASS[size]
          )}
          aria-label={editable.ariaLabel ?? "Change photo"}
          disabled={editable.busy}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editable.onPick();
          }}
        >
          {editable.busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Camera className={size === "xl" ? "h-4 w-4" : "h-3 w-3"} aria-hidden />
          )}
        </button>
      ) : null}

      {presenceProps ? (
        <span className="pointer-events-auto absolute -bottom-0.5 -end-0.5 z-10 flex">
          <PresenceBadge
            lastSeenAt={presenceProps.lastSeenAt}
            lastActiveAt={presenceProps.lastActiveAt}
            status={presenceProps.status}
            size={AVATAR_PRESENCE_SIZE[size]}
          />
        </span>
      ) : null}
    </span>
  );

  if (!noAccount || presenceProps) {
    return avatar;
  }

  const noAccountLabel = t("presence.noAccount", "No account");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex" aria-label={noAccountLabel}>
          {avatar}
          <span className="sr-only">{noAccountLabel}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom">{noAccountLabel}</TooltipContent>
    </Tooltip>
  );
}

/** Alias used across list rows, headers, selectors, topbar, and owners. */
export const PresenceAvatar = PersonAvatar;

/** Compact name + avatar chip for tables and selectors. */
export function PersonAvatarLabel({
  name,
  subtitle,
  avatar,
  className,
}: {
  name: string;
  subtitle?: ReactNode;
  avatar: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("flex min-w-0 items-center gap-2.5", className)}>
      {avatar}
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-[var(--foreground)]">{name}</span>
        {subtitle ? (
          <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">{subtitle}</span>
        ) : null}
      </span>
    </span>
  );
}
