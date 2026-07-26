"use client";

import Link from "next/link";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { prefetchRouteDestination } from "@/lib/navigation/route-prefetch";
import { cn } from "@/lib/utils";

interface SidebarNavLinkProps {
  href: string;
  label: React.ReactNode;
  icon: LucideIcon;
  active?: boolean;
  pending?: boolean;
  collapsed?: boolean;
  isRtl?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  badge?: React.ReactNode;
  className?: string;
  /** Extra end padding when a trailing control (e.g. pin) overlays the row. */
  trailingPad?: boolean;
}

export function SidebarNavLink({
  href,
  label,
  icon: Icon,
  active,
  pending,
  collapsed,
  isRtl,
  onClick,
  disabled,
  badge,
  className,
  trailingPad,
}: SidebarNavLinkProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function schedulePrefetch() {
    if (disabled || active) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      void prefetchRouteDestination(href, {
        router,
        queryClient,
        concurrency: 2,
      });
    }, 80);
  }

  function clearPrefetchTimer() {
    if (hoverTimer.current) {
      clearTimeout(hoverTimer.current);
      hoverTimer.current = null;
    }
  }

  const content = (
    <>
      {active && !collapsed && (
        <span
          className={cn(
            "ierp-nav-indicator absolute top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent)]",
            isRtl ? "right-0 left-auto" : "left-0"
          )}
          aria-hidden
        />
      )}
      <Icon
        className={cn(
          "ierp-nav-icon h-4 w-4 shrink-0 transition-colors",
          active ? "text-[var(--accent)]" : "opacity-70"
        )}
        aria-hidden
      />
      {!collapsed && (
        <span className="ierp-nav-label min-w-0 flex-1 truncate">{label}</span>
      )}
      {!collapsed && badge}
    </>
  );

  const linkClassName = cn(
    "ierp-nav-link relative",
    collapsed && "justify-center px-2",
    trailingPad && !collapsed && "pe-8",
    active && "ierp-nav-link-active",
    pending && !active && "ierp-nav-link-pending",
    className
  );

  if (disabled) {
    return (
      <span className="ierp-nav-row flex cursor-not-allowed select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--muted-foreground)] opacity-70">
        <Icon className="h-4 w-4 shrink-0 opacity-40" aria-hidden />
        {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      </span>
    );
  }

  const link = (
    <Link
      href={href}
      onClick={onClick}
      onMouseEnter={schedulePrefetch}
      onFocus={schedulePrefetch}
      onMouseLeave={clearPrefetchTimer}
      onBlur={clearPrefetchTimer}
      aria-current={active ? "page" : undefined}
      className={linkClassName}
    >
      {content}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side={isRtl ? "left" : "right"}>{typeof label === "string" ? label : label}</TooltipContent>
    </Tooltip>
  );
}
