"use client";

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useAppearanceStore } from "@/lib/appearance/store";
import {
  addMonthsLocal,
  clampApiDate,
  daysInMonth,
  isSameDay,
  parseApiDate,
  startOfMonth,
  toApiDate,
  todayApiDate,
} from "@/lib/date";
import { useI18n } from "@/lib/i18n";
import type { CalendarStyle } from "@/lib/i18n/types";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { controlTriggerClassName, inputClassName } from "@/lib/form-utils";
import { FormField } from "./form-field";
import { Button } from "@/components/ui/button";

export type DatePickerProps = {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  optional?: boolean;
  className?: string;
  min?: string;
  max?: string;
  /** future-only / past-only convenience constraints relative to today */
  allowFuture?: boolean;
  allowPast?: boolean;
  placeholder?: string;
  /** When provided, wraps with FormField. Omit for bare control (filters). */
  withField?: boolean;
};

type CalendarProps = {
  value: string;
  min?: string;
  max?: string;
  style: CalendarStyle;
  onSelect: (apiDate: string) => void;
  onClear?: () => void;
  onToday: () => void;
  labelledBy?: string;
};

function isDisabledDay(apiDate: string, min?: string, max?: string) {
  if (min && apiDate < min) return true;
  if (max && apiDate > max) return true;
  return false;
}

/** Keep calendar interactions from bubbling into dialogs / forms / row handlers. */
function stopCalendarEvent(
  event: ReactMouseEvent | ReactPointerEvent | ReactKeyboardEvent | { preventDefault(): void; stopPropagation(): void }
) {
  event.preventDefault();
  event.stopPropagation();
}

function CalendarGrid({ value, min, max, style, onSelect, onClear, onToday, labelledBy }: CalendarProps) {
  const { t, locale } = useI18n();
  const selected = parseApiDate(value);
  const today = parseApiDate(todayApiDate())!;
  const [view, setView] = useState(() => startOfMonth(selected ?? today));
  const dense = style === "compact";
  const localeTag = locale === "ar" ? "ar-JO" : "en-GB";

  const weekdays = useMemo(() => {
    const base = new Date(2024, 0, 7); // Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return new Intl.DateTimeFormat(localeTag, { weekday: "short" }).format(d);
    });
  }, [localeTag]);

  const monthLabel = new Intl.DateTimeFormat(localeTag, {
    month: "long",
    year: "numeric",
  }).format(view);

  const cells = useMemo(() => {
    const first = startOfMonth(view);
    const startPad = first.getDay();
    const total = daysInMonth(view.getFullYear(), view.getMonth());
    const items: Array<{ date: Date; inMonth: boolean }> = [];
    for (let i = 0; i < startPad; i++) {
      const d = new Date(view.getFullYear(), view.getMonth(), i - startPad + 1);
      items.push({ date: d, inMonth: false });
    }
    for (let day = 1; day <= total; day++) {
      items.push({ date: new Date(view.getFullYear(), view.getMonth(), day), inMonth: true });
    }
    while (items.length % 7 !== 0) {
      const last = items[items.length - 1].date;
      items.push({
        date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
        inMonth: false,
      });
    }
    return items;
  }, [view]);

  const years = useMemo(() => {
    const center = view.getFullYear();
    return Array.from({ length: 21 }, (_, i) => center - 10 + i);
  }, [view]);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby={labelledBy}
      data-calendar-style={style}
      className={cn(
        "pointer-events-auto w-[18.5rem] rounded-xl border border-[var(--border-subtle)] bg-[var(--popover)] text-[var(--popover-foreground)] shadow-[var(--shadow-lg)]",
        dense ? "p-2.5" : "p-3.5"
      )}
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex items-center justify-between gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer"
          aria-label={t("datePicker.prevMonth")}
          onClick={(e) => {
            stopCalendarEvent(e);
            setView((v) => addMonthsLocal(v, -1));
          }}
        >
          <ChevronLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
          <select
            aria-label={t("datePicker.month")}
            className="h-8 max-w-[7.5rem] cursor-pointer rounded-md border border-[var(--border-subtle)] bg-[var(--background)] px-1.5 text-xs font-medium"
            value={view.getMonth()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) =>
              setView(new Date(view.getFullYear(), Number(e.target.value), 1))
            }
          >
            {Array.from({ length: 12 }, (_, m) => (
              <option key={m} value={m}>
                {new Intl.DateTimeFormat(localeTag, { month: "short" }).format(
                  new Date(2024, m, 1)
                )}
              </option>
            ))}
          </select>
          <select
            aria-label={t("datePicker.year")}
            className="h-8 cursor-pointer rounded-md border border-[var(--border-subtle)] bg-[var(--background)] px-1.5 text-xs font-medium"
            value={view.getFullYear()}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setView(new Date(Number(e.target.value), view.getMonth(), 1))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 cursor-pointer"
          aria-label={t("datePicker.nextMonth")}
          onClick={(e) => {
            stopCalendarEvent(e);
            setView((v) => addMonthsLocal(v, 1));
          }}
        >
          <ChevronRight className="h-4 w-4 rtl:rotate-180" aria-hidden />
        </Button>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        {weekdays.map((d) => (
          <div key={d} className={cn(dense ? "py-0.5" : "py-1")}>
            {d}
          </div>
        ))}
      </div>

      <div role="grid" className="grid grid-cols-7 gap-0.5">
        {cells.map(({ date, inMonth }) => {
          const api = toApiDate(date);
          const disabled = !inMonth || isDisabledDay(api, min, max);
          const selectedDay = selected ? isSameDay(date, selected) : false;
          const isToday = isSameDay(date, today);
          return (
            <button
              key={api + String(inMonth)}
              type="button"
              role="gridcell"
              disabled={disabled}
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                stopCalendarEvent(e);
                if (!disabled) onSelect(api);
              }}
              className={cn(
                "relative flex items-center justify-center rounded-md text-sm tabular-nums transition-colors",
                dense ? "h-7" : "h-8",
                !inMonth && "opacity-30",
                disabled
                  ? "cursor-not-allowed opacity-40"
                  : "cursor-pointer hover:bg-[var(--muted-bg)]",
                selectedDay &&
                  !disabled &&
                  "bg-[var(--accent)] font-semibold text-[var(--accent-foreground)] hover:bg-[var(--accent-hover)]",
                isToday &&
                  !selectedDay &&
                  !disabled &&
                  "ring-1 ring-inset ring-[var(--accent)]/50 font-medium"
              )}
              aria-label={api}
              aria-current={isToday ? "date" : undefined}
              aria-selected={selectedDay}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "mt-2 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-2",
          dense && "mt-1.5 pt-1.5"
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 cursor-pointer px-2 text-xs"
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            stopCalendarEvent(e);
            onToday();
          }}
        >
          {t("datePicker.today")}
        </Button>
        {onClear && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 cursor-pointer px-2 text-xs"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              stopCalendarEvent(e);
              onClear();
            }}
          >
            {t("datePicker.clear")}
          </Button>
        )}
        <span className="ms-auto text-[10px] text-[var(--muted)]">{monthLabel}</span>
      </div>
    </div>
  );
}

function DatePickerControl({
  id,
  value,
  onChange,
  disabled,
  optional,
  min,
  max,
  allowFuture = true,
  allowPast = true,
  placeholder,
  className,
}: Omit<DatePickerProps, "label" | "error" | "required" | "withField">) {
  const { t, locale } = useI18n();
  const calendarStyle = useAppearanceStore((s) => s.calendarStyle);
  const reducedMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const labelId = useId();

  const today = todayApiDate();
  const effectiveMin = useMemo(() => {
    if (!allowPast && (!min || min < today)) return today;
    return min;
  }, [allowPast, min, today]);
  const effectiveMax = useMemo(() => {
    if (!allowFuture && (!max || max > today)) return today;
    return max;
  }, [allowFuture, max, today]);

  const display = useMemo(() => {
    const parsed = parseApiDate(value);
    if (!parsed) return "";
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-JO" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(parsed);
  }, [locale, value]);

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const panelWidth = 296;
    const panelHeight = 340;
    const gap = 6;
    let left = rect.left;
    if (left + panelWidth > window.innerWidth - 8) {
      left = Math.max(8, rect.right - panelWidth);
    }
    let top = rect.bottom + gap;
    if (top + panelHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - panelHeight - gap);
    }
    setCoords({ top, left });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updatePosition();
    const onResize = () => updatePosition();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const isInsidePicker = (target: EventTarget | null) => {
      if (!(target instanceof Node)) return false;
      return Boolean(
        panelRef.current?.contains(target) || triggerRef.current?.contains(target)
      );
    };

    const onPointerDown = (event: PointerEvent) => {
      if (isInsidePicker(event.target)) return;
      setOpen(false);
      triggerRef.current?.focus();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        // Close calendar first; do not let Escape dismiss the parent dialog.
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), select:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    // Bubble phase for outside dismiss (Radix outside handlers are layered separately).
    document.addEventListener("pointerdown", onPointerDown);
    // Capture Escape before Radix Dialog closes the parent modal.
    document.addEventListener("keydown", onKeyDown, true);

    const focusTimer = window.setTimeout(() => {
      const firstEnabled = panelRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), select:not([disabled])'
      );
      firstEnabled?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  const commit = (next: string) => {
    const clamped = clampApiDate(next, effectiveMin, effectiveMax);
    onChange(clamped);
    setOpen(false);
    triggerRef.current?.focus();
  };

  if (calendarStyle === "system") {
    return (
      <input
        id={id}
        type="date"
        value={value}
        disabled={disabled}
        min={effectiveMin}
        max={effectiveMax}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          inputClassName,
          "cursor-pointer",
          disabled && "cursor-not-allowed opacity-60",
          className
        )}
      />
    );
  }

  const panel =
    open && coords
      ? createPortal(
          <div
            ref={panelRef}
            data-erp-datepicker-portal=""
            className="pointer-events-auto fixed z-[200]"
            style={{
              top: coords.top,
              left: coords.left,
              transition: reducedMotion ? undefined : "opacity 120ms ease",
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <CalendarGrid
              value={value}
              min={effectiveMin}
              max={effectiveMax}
              style={calendarStyle}
              labelledBy={labelId}
              onSelect={commit}
              onToday={() => commit(todayApiDate())}
              onClear={
                optional
                  ? () => {
                      onChange("");
                      setOpen(false);
                      triggerRef.current?.focus();
                    }
                  : undefined
              }
            />
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div className={cn("relative", className)}>
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? labelId : undefined}
          onClick={(e) => {
            e.stopPropagation();
            setOpen((v) => !v);
          }}
          onKeyDown={(e: ReactKeyboardEvent) => {
            if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              setOpen(true);
            }
          }}
          className={cn(
            controlTriggerClassName,
            disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
            open && "border-[var(--accent)] ring-2 ring-[var(--ring)]"
          )}
        >
          <span className={cn("truncate", !display && "text-[var(--muted)]")}>
            {display || placeholder || t("datePicker.placeholder")}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-[var(--muted)]">
            {optional && value && !disabled && (
              <button
                type="button"
                tabIndex={-1}
                className="cursor-pointer rounded p-0.5 hover:bg-[var(--muted-bg)] hover:text-[var(--foreground)]"
                onClick={(e) => {
                  stopCalendarEvent(e);
                  onChange("");
                }}
                aria-label={t("datePicker.clear")}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
            <CalendarDays className="h-4 w-4" aria-hidden />
          </span>
        </button>
        <span id={labelId} className="sr-only">
          {t("datePicker.calendar")}
        </span>
      </div>
      {panel}
    </>
  );
}

export function DatePicker({
  label,
  error,
  required,
  withField = true,
  className,
  ...controlProps
}: DatePickerProps) {
  if (!withField || !label) {
    return (
      <DatePickerControl
        {...controlProps}
        className={className}
        optional={controlProps.optional ?? !required}
      />
    );
  }
  return (
    <FormField
      label={label}
      htmlFor={controlProps.id}
      error={error}
      required={required}
      className={className}
    >
      <DatePickerControl {...controlProps} optional={controlProps.optional ?? !required} />
    </FormField>
  );
}

/** Back-compat alias used across forms. */
export function DateInput(props: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  min?: string;
  max?: string;
  optional?: boolean;
}) {
  return <DatePicker {...props} withField />;
}

export type DateRangeValue = { start: string; end: string };

export function DateRangePicker({
  id,
  label,
  value,
  onChange,
  error,
  required,
  disabled,
  className,
  min,
  max,
}: {
  id: string;
  label: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  min?: string;
  max?: string;
}) {
  const { t } = useI18n();
  return (
    <FormField label={label} htmlFor={`${id}-start`} error={error} required={required} className={className}>
      <div className="grid gap-2 sm:grid-cols-2">
        <DatePickerControl
          id={`${id}-start`}
          value={value.start}
          onChange={(start) => onChange({ start, end: value.end })}
          disabled={disabled}
          min={min}
          max={value.end || max}
          placeholder={t("datePicker.start")}
          optional={!required}
        />
        <DatePickerControl
          id={`${id}-end`}
          value={value.end}
          onChange={(end) => onChange({ start: value.start, end })}
          disabled={disabled}
          min={value.start || min}
          max={max}
          placeholder={t("datePicker.end")}
          optional={!required}
        />
      </div>
    </FormField>
  );
}
