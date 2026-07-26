"use client";

import { useState } from "react";
import type { AttendanceStatus } from "@ierp/shared";
import { Building2, Clock3, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormField } from "@/components/forms/form-field";
import { inputClassName } from "@/lib/form-utils";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Employee-selectable check-in modes (Late/Absent are system/HR only). */
export type SelfCheckInMode = Extract<AttendanceStatus, "PRESENT" | "REMOTE" | "HALF_DAY">;

const CHECK_IN_MODES: Array<{
  value: SelfCheckInMode;
  icon: typeof Building2;
  labelKey: string;
  fallback: string;
  hintKey: string;
  hintFallback: string;
}> = [
  {
    value: "PRESENT",
    icon: Building2,
    labelKey: "selfService.checkInMode.present",
    fallback: "On-site",
    hintKey: "selfService.checkInMode.presentHint",
    hintFallback: "Working at the office or assigned site",
  },
  {
    value: "REMOTE",
    icon: Home,
    labelKey: "selfService.checkInMode.remote",
    fallback: "Remote",
    hintKey: "selfService.checkInMode.remoteHint",
    hintFallback: "Working from home or another remote location",
  },
  {
    value: "HALF_DAY",
    icon: Clock3,
    labelKey: "selfService.checkInMode.halfDay",
    fallback: "Half day",
    hintKey: "selfService.checkInMode.halfDayHint",
    hintFallback: "Working a partial day",
  },
];

export function CheckInModeDialog({
  open,
  onOpenChange,
  loading,
  disabled,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  disabled?: boolean;
  onConfirm: (input: { mode: SelfCheckInMode; notes?: string }) => Promise<void> | void;
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState<SelfCheckInMode>("PRESENT");
  const [notes, setNotes] = useState("");

  function handleOpenChange(next: boolean) {
    if (loading && !next) return;
    onOpenChange(next);
    if (!next) {
      setMode("PRESENT");
      setNotes("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || disabled) return;
    const trimmed = notes.trim();
    await onConfirm({
      mode,
      notes: mode === "PRESENT" ? undefined : trimmed || undefined,
    });
  }

  const showNotes = mode === "REMOTE" || mode === "HALF_DAY";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("selfService.checkIn", "Check in")}</DialogTitle>
          <DialogDescription>
            {t(
              "selfService.checkInModeDesc",
              "Choose how you are working today. Late and absent are calculated by the system."
            )}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <div
            className="grid gap-2"
            role="radiogroup"
            aria-label={t("selfService.checkInMode", "Work mode")}
          >
            {CHECK_IN_MODES.map((option) => {
              const Icon = option.icon;
              const selected = mode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={loading || disabled}
                  onClick={() => setMode(option.value)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-start transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
                    selected
                      ? "border-[var(--accent)]/45 bg-[var(--accent)]/[0.08]"
                      : "border-[var(--border-subtle)] hover:border-[var(--border)] hover:bg-[var(--muted-bg)]/40",
                    (loading || disabled) && "pointer-events-none opacity-60"
                  )}
                >
                  <Icon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      selected ? "text-[var(--accent)]" : "text-[var(--muted)]"
                    )}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-[var(--foreground)]">
                      {t(option.labelKey, option.fallback)}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--muted)]">
                      {t(option.hintKey, option.hintFallback)}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {showNotes ? (
            <FormField
              htmlFor="check-in-notes"
              label={t("selfService.checkInNote", "Note (optional)")}
              hint={t(
                "selfService.checkInNoteHint",
                "Short context for remote or half-day work."
              )}
            >
              <textarea
                id="check-in-notes"
                className={inputClassName}
                rows={2}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={loading || disabled}
              />
            </FormField>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={loading}
              onClick={() => handleOpenChange(false)}
            >
              {t("form.cancel")}
            </Button>
            <Button
              type="submit"
              loading={loading}
              loadingText={t("selfService.checkingIn", "Checking in…")}
              disabled={disabled || loading}
            >
              {t("selfService.checkIn", "Check in")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
