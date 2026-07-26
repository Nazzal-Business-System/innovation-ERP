"use client";

import {
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import {
  GripVertical,
  MoreHorizontal,
  Pin,
  PinOff,
  ArrowUp,
  ArrowDown,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { getNavItemById } from "@ierp/shared";
import { cn } from "@/lib/utils";
import { useI18n, useNavLabel } from "@/lib/i18n";
import { isNavItemActive } from "@/lib/nav-active";
import {
  selectVisiblePins,
  useSidebarPinsStore,
} from "@/lib/sidebar-pins-store";
import { useAuthStore } from "@/lib/auth-store";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

type IconMap = Record<string, LucideIcon>;

/** Isolate action clicks from row/drawer navigation without blocking Radix open. */
function stopRowPropagation(event: PointerEvent | MouseEvent) {
  event.stopPropagation();
}

function PinnedLabel({ itemId }: { itemId: string }) {
  const label = useNavLabel(itemId);
  return <>{label}</>;
}

export function useIsPinned(itemId: string): boolean {
  return useSidebarPinsStore((s) => s.sidebarPins.some((p) => p.id === itemId));
}

/**
 * Canonical-row pin control.
 * Visibility is derived live from the pins store (not a stale prop closure).
 *
 * Unpinned: hover / :focus-visible within this row / self focus-visible only.
 * Avoid plain :focus-within — an active route link often keeps mouse-focus and
 * would otherwise leave the pin permanently visible.
 */
export function NavItemPinButton({
  itemId,
  isRtl,
}: {
  itemId: string;
  isRtl: boolean;
}) {
  const { t } = useI18n();
  const pinned = useIsPinned(itemId);
  const pinItem = useSidebarPinsStore((s) => s.pinItem);
  const unpinItem = useSidebarPinsStore((s) => s.unpinItem);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          ref={buttonRef}
          type="button"
          data-pinned={pinned ? "true" : "false"}
          className={cn(
            "absolute end-1 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-[var(--muted-foreground)] transition-opacity duration-150",
            "opacity-0",
            // Mouse: this row only
            "group-hover/navrow:opacity-100",
            // Keyboard: reveal when this row has a :focus-visible descendant (link or button)
            "group-has-[:focus-visible]/navrow:opacity-100",
            "focus-visible:opacity-100",
            // Pinned: always visible until unpinned
            "data-[pinned=true]:opacity-100 data-[pinned=true]:text-[var(--accent)]"
          )}
          aria-label={pinned ? t("nav.unpin", "Unpin") : t("nav.pin", "Pin")}
          aria-pressed={pinned}
          onPointerDown={stopRowPropagation}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (pinned) unpinItem(itemId);
            else pinItem(itemId);
            // Clear focus so unpinned icon does not linger via :focus-visible
            requestAnimationFrame(() => buttonRef.current?.blur());
          }}
        >
          <Pin
            className={cn("h-3.5 w-3.5", pinned && "fill-current")}
            aria-hidden
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side={isRtl ? "left" : "right"}>
        {pinned ? t("nav.unpin", "Unpin") : t("nav.pin", "Pin")}
      </TooltipContent>
    </Tooltip>
  );
}

/** Row shell: link + actions as siblings (never nest button inside anchor). */
export function CanonicalNavRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn("group/navrow relative", className)}>{children}</div>;
}

export function SidebarPinnedSection({
  collapsed,
  isRtl,
  pathname,
  pendingHref,
  icons,
  onNavigate,
}: {
  collapsed: boolean;
  isRtl: boolean;
  pathname: string;
  pendingHref: string | null;
  icons: IconMap;
  /** Called only when the user activates a navigation link — never for menus/drag. */
  onNavigate: (href: string) => void;
}) {
  const { t } = useI18n();
  const permissions = useAuthStore((s) => s.permissions);
  const showPinnedSection = useSidebarPinsStore((s) => s.showPinnedSection);
  const sidebarPins = useSidebarPinsStore((s) => s.sidebarPins);
  const reorderPins = useSidebarPinsStore((s) => s.reorderPins);
  const movePin = useSidebarPinsStore((s) => s.movePin);
  const unpinItem = useSidebarPinsStore((s) => s.unpinItem);
  const clearPins = useSidebarPinsStore((s) => s.clearPins);

  const visible = selectVisiblePins(sidebarPins, permissions);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);

  if (!showPinnedSection || visible.length === 0) return null;

  function onGripDragStart(event: DragEvent, id: string) {
    event.stopPropagation();
    setDragId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
    // Improve DnD reliability in Chromium
    event.dataTransfer.setData("application/x-ierp-pin-id", id);
  }

  function onRowDragOver(event: DragEvent, targetId: string) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    if (dragOverId !== targetId) setDragOverId(targetId);
  }

  function onRowDrop(event: DragEvent, targetId: string) {
    event.preventDefault();
    event.stopPropagation();
    const sourceId =
      dragId ||
      event.dataTransfer.getData("application/x-ierp-pin-id") ||
      event.dataTransfer.getData("text/plain");
    setDragId(null);
    setDragOverId(null);
    if (!sourceId || sourceId === targetId) return;
    const ids = visible.map((p) => p.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, sourceId);
    reorderPins(next);
  }

  function endDrag() {
    setDragId(null);
    setDragOverId(null);
  }

  if (collapsed) {
    return (
      <div className="mb-4 space-y-1 border-b border-[var(--sidebar-border)] pb-4">
        <p className="sr-only">{t("nav.pinned", "Pinned")}</p>
        <ul className="flex flex-col items-center gap-1">
          {visible.map((pin) => {
            const item = getNavItemById(pin.id);
            if (!item) return null;
            const Icon = icons[pin.id] ?? Pin;
            const matching = isNavItemActive(item.href, pathname);
            return (
              <li key={pin.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      onClick={() => onNavigate(item.href)}
                      className={cn(
                        "ierp-nav-link justify-center px-2",
                        matching && "bg-[var(--accent-muted)]/60 text-[var(--accent)]"
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                      <span className="sr-only">
                        <PinnedLabel itemId={pin.id} />
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side={isRtl ? "left" : "right"}>
                    <PinnedLabel itemId={pin.id} />
                  </TooltipContent>
                </Tooltip>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="mb-2 border-b border-[var(--sidebar-border)] pb-4">
      <div className="mb-2 flex items-center gap-2 px-2">
        <Pin className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)]" aria-hidden />
        <span
          className={cn(
            "flex-1 text-[10px] font-semibold text-[var(--muted-foreground)]",
            isRtl ? "tracking-normal normal-case text-right" : "uppercase tracking-[0.14em]"
          )}
        >
          {t("nav.pinned", "Pinned")}
        </span>
        {/* modal={false}: avoid Radix dismiss layer stealing clicks from the mobile drawer */}
        <DropdownMenu open={sectionMenuOpen} onOpenChange={setSectionMenuOpen} modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-[var(--muted-foreground)]"
              aria-label={t("nav.pinnedMenu", "Pinned options")}
              aria-expanded={sectionMenuOpen}
              onPointerDown={stopRowPropagation}
              onMouseDown={stopRowPropagation}
              onClick={stopRowPropagation}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={isRtl ? "start" : "end"}
            className="z-[200] min-w-[10rem]"
            sideOffset={6}
          >
            <DropdownMenuItem
              className="text-[var(--destructive)] focus:text-[var(--destructive)]"
              onSelect={() => clearPins()}
            >
              <Trash2 className="me-2 h-3.5 w-3.5" />
              {t("nav.clearPins", "Clear all pins")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <ul className="space-y-0.5">
        {visible.map((pin, index) => {
          const item = getNavItemById(pin.id);
          if (!item) return null;
          return (
            <PinnedRow
              key={pin.id}
              itemId={pin.id}
              href={item.href}
              Icon={icons[pin.id] ?? Pin}
              index={index}
              total={visible.length}
              matching={isNavItemActive(item.href, pathname)}
              pending={pendingHref === item.href}
              dragging={dragId === pin.id}
              dragOver={dragOverId === pin.id && dragId !== pin.id}
              isRtl={isRtl}
              onNavigate={onNavigate}
              onGripDragStart={(e) => onGripDragStart(e, pin.id)}
              onDragOver={(e) => onRowDragOver(e, pin.id)}
              onDrop={(e) => onRowDrop(e, pin.id)}
              onDragEnd={endDrag}
              onMoveUp={() => movePin(pin.id, "up")}
              onMoveDown={() => movePin(pin.id, "down")}
              onUnpin={() => unpinItem(pin.id)}
            />
          );
        })}
      </ul>
    </div>
  );
}

function PinnedRow({
  itemId,
  href,
  Icon,
  index,
  total,
  matching,
  pending,
  dragging,
  dragOver,
  isRtl,
  onNavigate,
  onGripDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onMoveUp,
  onMoveDown,
  onUnpin,
}: {
  itemId: string;
  href: string;
  Icon: LucideIcon;
  index: number;
  total: number;
  matching: boolean;
  pending: boolean;
  dragging: boolean;
  dragOver: boolean;
  isRtl: boolean;
  onNavigate: (href: string) => void;
  onGripDragStart: (event: DragEvent) => void;
  onDragOver: (event: DragEvent) => void;
  onDrop: (event: DragEvent) => void;
  onDragEnd: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUnpin: () => void;
}) {
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <li
      className={cn("group/pin relative", dragging && "opacity-60")}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragLeave={() => {
        /* leave handled via dragOverId updates */
      }}
    >
      <div
        className={cn(
          "relative flex items-center gap-1 rounded-lg border border-transparent px-1 py-0.5",
          matching && "border-[var(--border-subtle)] bg-[var(--accent-muted)]/45",
          pending && !matching && "bg-[var(--sidebar-hover)]",
          menuOpen && "border-[var(--border-subtle)]",
          dragOver && "border-[var(--accent)]/50 bg-[var(--accent-muted)]/30"
        )}
      >
        {/*
          Drag handle: non-<button> element — HTML5 DnD is unreliable on <button>.
          Only the handle is draggable; the nav Link and menu stay separate.
        */}
        <span
          role="button"
          tabIndex={0}
          draggable
          onDragStart={onGripDragStart}
          onDragEnd={onDragEnd}
          className={cn(
            "hidden h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded text-[var(--muted-foreground)] active:cursor-grabbing sm:inline-flex",
            "opacity-0 group-hover/pin:opacity-100 group-has-[:focus-visible]/pin:opacity-100",
            menuOpen && "opacity-100"
          )}
          aria-label={t("nav.dragPin", "Drag to reorder")}
          onClick={stopRowPropagation}
          onPointerDown={stopRowPropagation}
          onMouseDown={stopRowPropagation}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") {
              e.preventDefault();
              e.stopPropagation();
              onMoveUp();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              e.stopPropagation();
              onMoveDown();
            }
          }}
        >
          <GripVertical className="h-3.5 w-3.5 pointer-events-none" aria-hidden />
        </span>

        <Link
          href={href}
          onClick={() => onNavigate(href)}
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm font-medium text-[var(--muted)] hover:text-[var(--sidebar-foreground)]"
        >
          <Icon
            className={cn("h-4 w-4 shrink-0", matching ? "text-[var(--accent)]" : "opacity-70")}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate">
            <PinnedLabel itemId={itemId} />
          </span>
        </Link>

        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen} modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 shrink-0",
                "opacity-0 group-hover/pin:opacity-100 group-has-[:focus-visible]/pin:opacity-100",
                "focus-visible:opacity-100",
                menuOpen && "opacity-100"
              )}
              aria-label={t("nav.pinActions", "Pin actions")}
              aria-expanded={menuOpen}
              onPointerDown={stopRowPropagation}
              onMouseDown={stopRowPropagation}
              onClick={stopRowPropagation}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align={isRtl ? "start" : "end"}
            className="z-[200]"
            sideOffset={6}
          >
            <DropdownMenuItem disabled={index === 0} onSelect={() => onMoveUp()}>
              <ArrowUp className="me-2 h-3.5 w-3.5" />
              {t("nav.moveUp", "Move up")}
            </DropdownMenuItem>
            <DropdownMenuItem disabled={index === total - 1} onSelect={() => onMoveDown()}>
              <ArrowDown className="me-2 h-3.5 w-3.5" />
              {t("nav.moveDown", "Move down")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => onUnpin()}>
              <PinOff className="me-2 h-3.5 w-3.5" />
              {t("nav.unpin", "Unpin")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

/** Right-click / Shift+F10 menu for pin actions on the collapsed icon rail. */
export function CollapsedNavPinMenu({
  itemId,
  isRtl,
  children,
}: {
  itemId: string;
  isRtl: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const pinned = useIsPinned(itemId);
  const pinItem = useSidebarPinsStore((s) => s.pinItem);
  const unpinItem = useSidebarPinsStore((s) => s.unpinItem);
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <div
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.shiftKey && e.key === "F10") {
            e.preventDefault();
            setOpen(true);
          }
        }}
      >
        {children}
      </div>
      <DropdownMenuTrigger asChild>
        <button type="button" className="sr-only" tabIndex={-1} aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent side={isRtl ? "left" : "right"} className="z-[200]" sideOffset={6}>
        <DropdownMenuItem
          onSelect={() => {
            if (pinned) unpinItem(itemId);
            else pinItem(itemId);
          }}
        >
          {pinned ? (
            <>
              <PinOff className="me-2 h-3.5 w-3.5" />
              {t("nav.unpin", "Unpin")}
            </>
          ) : (
            <>
              <Pin className="me-2 h-3.5 w-3.5" />
              {t("nav.pinToSidebar", "Pin to sidebar")}
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
