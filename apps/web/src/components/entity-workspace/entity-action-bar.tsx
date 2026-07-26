"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { resolveEntityActions } from "@/lib/entity-workspace/actions";
import { resolveActionPendingLabel } from "@/lib/entity-workspace/pending-label";
import type { EntityAction } from "@/lib/entity-workspace/types";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function useNarrowViewport(breakpointPx = 768) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpointPx}px)`);
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [breakpointPx]);
  return narrow;
}

function ActionButton({
  action,
  variant,
  pendingLabel,
  onRequestConfirm,
}: {
  action: EntityAction;
  variant: "default" | "secondary" | "destructive" | "outline";
  pendingLabel: string;
  onRequestConfirm: (action: EntityAction) => void;
}) {
  const handleClick = () => {
    if (action.disabled || action.pending) return;
    if (action.confirm) {
      onRequestConfirm(action);
      return;
    }
    action.onSelect();
  };

  const button = (
    <Button
      type="button"
      size="sm"
      variant={variant}
      loading={action.pending}
      loadingText={pendingLabel}
      disabled={action.disabled || action.pending}
      onClick={handleClick}
      aria-label={action.pending ? pendingLabel : action.label}
      className="shrink-0"
    >
      {action.icon}
      <span className="max-w-[10rem] truncate">{action.label}</span>
    </Button>
  );

  if (action.disabled && action.disabledReason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{button}</span>
        </TooltipTrigger>
        <TooltipContent>{action.disabledReason}</TooltipContent>
      </Tooltip>
    );
  }

  return button;
}

export function EntityActionBar({
  actions,
  capabilities,
  maxVisibleSecondary = 3,
  className,
}: {
  actions: EntityAction[];
  capabilities?: ReadonlySet<string> | readonly string[];
  maxVisibleSecondary?: number;
  className?: string;
}) {
  const { t } = useI18n();
  const narrow = useNarrowViewport();
  const [confirmActionId, setConfirmActionId] = useState<string | null>(null);
  const wasConfirmPending = useRef(false);

  const resolved = useMemo(
    () =>
      resolveEntityActions(actions, {
        capabilities,
        maxVisibleSecondary,
        forceOverflow: narrow,
      }),
    [actions, capabilities, maxVisibleSecondary, narrow]
  );

  const confirmAction = useMemo(() => {
    if (!confirmActionId) return null;
    return actions.find((action) => action.id === confirmActionId) ?? null;
  }, [actions, confirmActionId]);

  const confirmPending = Boolean(confirmAction?.pending);
  const confirmPendingLabel = resolveActionPendingLabel(confirmAction, t);

  useEffect(() => {
    if (!confirmActionId) {
      wasConfirmPending.current = false;
      return;
    }
    if (!confirmAction) {
      wasConfirmPending.current = false;
      setConfirmActionId(null);
      return;
    }
    if (confirmPending) {
      wasConfirmPending.current = true;
      return;
    }
    if (wasConfirmPending.current) {
      wasConfirmPending.current = false;
      setConfirmActionId(null);
    }
  }, [confirmActionId, confirmAction, confirmPending]);

  const overflowItems = [...resolved.overflow, ...resolved.destructive];
  const hasOverflow = overflowItems.length > 0;

  function requestConfirm(action: EntityAction) {
    wasConfirmPending.current = false;
    setConfirmActionId(action.id);
  }

  function handleConfirmOpenChange(open: boolean) {
    if (!open && confirmPending) return;
    if (!open) {
      wasConfirmPending.current = false;
      setConfirmActionId(null);
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className={cn("flex min-w-0 flex-wrap items-center justify-end gap-2", className)}
        role="toolbar"
        aria-label={t("common.actions")}
      >
        {resolved.secondary.map((action) => (
          <ActionButton
            key={action.id}
            action={action}
            variant="secondary"
            pendingLabel={resolveActionPendingLabel(action, t)}
            onRequestConfirm={requestConfirm}
          />
        ))}
        {resolved.primary ? (
          <ActionButton
            action={resolved.primary}
            variant="default"
            pendingLabel={resolveActionPendingLabel(resolved.primary, t)}
            onRequestConfirm={requestConfirm}
          />
        ) : null}
        {hasOverflow ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                aria-label={t("entityWorkspace.moreActions")}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">{t("entityWorkspace.moreActions")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[12rem]">
              {resolved.overflow.map((action) => {
                const pendingLabel = resolveActionPendingLabel(action, t);
                return (
                  <DropdownMenuItem
                    key={action.id}
                    disabled={action.disabled || action.pending}
                    aria-busy={action.pending || undefined}
                    onSelect={(event) => {
                      if (action.disabled || action.pending) {
                        event.preventDefault();
                        return;
                      }
                      if (action.confirm) {
                        event.preventDefault();
                        requestConfirm(action);
                        return;
                      }
                      action.onSelect();
                    }}
                    title={action.disabledReason}
                  >
                    {action.pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      action.icon
                    )}
                    <span className="flex-1">
                      {action.pending ? pendingLabel : action.label}
                    </span>
                    {action.disabledReason ? (
                      <span className="ms-2 max-w-[8rem] truncate text-[10px] text-[var(--muted)]">
                        {action.disabledReason}
                      </span>
                    ) : null}
                  </DropdownMenuItem>
                );
              })}
              {resolved.overflow.length > 0 && resolved.destructive.length > 0 ? (
                <DropdownMenuSeparator />
              ) : null}
              {resolved.destructive.map((action) => {
                const pendingLabel = resolveActionPendingLabel(action, t);
                return (
                  <DropdownMenuItem
                    key={action.id}
                    disabled={action.disabled || action.pending}
                    aria-busy={action.pending || undefined}
                    className="text-[var(--destructive)] focus:text-[var(--destructive)]"
                    onSelect={(event) => {
                      if (action.disabled || action.pending) {
                        event.preventDefault();
                        return;
                      }
                      event.preventDefault();
                      requestConfirm(action);
                    }}
                    title={action.disabledReason}
                  >
                    {action.pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      action.icon
                    )}
                    {action.pending ? pendingLabel : action.label}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <Dialog open={!!confirmActionId && !!confirmAction} onOpenChange={handleConfirmOpenChange}>
        <DialogContent
          onEscapeKeyDown={(event) => {
            if (confirmPending) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            if (confirmPending) event.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.confirmTitle ?? t("entityWorkspace.confirmTitle")}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.confirmDescription ??
                `${t("entityWorkspace.confirmDescription")} (${confirmAction?.label ?? ""})`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              className="min-h-10"
              disabled={confirmPending}
              onClick={() => handleConfirmOpenChange(false)}
            >
              {t("form.cancel")}
            </Button>
            <Button
              type="button"
              variant={confirmAction?.kind === "destructive" ? "destructive" : "default"}
              className="min-h-10"
              loading={confirmPending}
              loadingText={confirmPendingLabel}
              disabled={confirmPending || !confirmAction}
              onClick={() => {
                if (confirmPending || !confirmAction) return;
                confirmAction.onSelect();
              }}
            >
              {confirmAction?.label ?? t("entityWorkspace.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
