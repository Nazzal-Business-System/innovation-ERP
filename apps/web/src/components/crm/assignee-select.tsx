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
} from "react";
import { createPortal } from "react-dom";
import { ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/avatar/person-avatar";
import { useCrmAssignees } from "@/lib/hooks/use-crm";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CrmAssigneeOption } from "@ierp/shared";

const LOOKUP_LIMIT = 20;

export function AssigneeSelect({
  id,
  value,
  onChange,
  required,
  error,
  label,
  disabled,
  pending,
  pendingLabel,
  initialOption,
  placeholder,
}: {
  id: string;
  /** Currently selected assignee's user id. */
  value: string | null | undefined;
  onChange: (option: CrmAssigneeOption | null) => void;
  required?: boolean;
  error?: string;
  label?: string;
  disabled?: boolean;
  /** True while a reassignment mutation is in flight (action-level only). */
  pending?: boolean;
  /** Accessible pending announcement. */
  pendingLabel?: string;
  /** Fallback display data for the current value before it's found in fetched options. */
  initialOption?: CrmAssigneeOption | null;
  placeholder?: string;
}) {
  const { t } = useI18n();
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const busy = Boolean(disabled || pending);
  const pendingText = pendingLabel?.trim() || t("action.assigning", "Assigning…");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (pending && open) setOpen(false);
  }, [pending, open]);

  const {
    data,
    loading,
    error: fetchError,
    refetch,
  } = useCrmAssignees({ search: debounced || undefined });

  const options = useMemo<CrmAssigneeOption[]>(
    () => (data?.data ?? []).slice(0, LOOKUP_LIMIT),
    [data]
  );

  const selectedOption = value
    ? options.find((o) => o.id === value) ?? (initialOption?.id === value ? initialOption : null)
    : null;

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, 300);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, rect.right - width);
    }
    let top = rect.bottom + 6;
    const panelHeight = 340;
    if (top + panelHeight > window.innerHeight - 8) {
      top = Math.max(8, rect.top - panelHeight - 6);
    }
    setCoords({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
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
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selectedIdx = options.findIndex((o) => o.id === value);
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);
  }, [open, options, value]);

  function selectOption(option: CrmAssigneeOption) {
    onChange(option);
    setOpen(false);
    setSearch("");
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(e: ReactKeyboardEvent) {
    if (busy) return;
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen(true);
    }
  }

  function handleSearchKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(options.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = options[activeIndex];
      if (option) selectOption(option);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  const panel =
    open && coords
      ? createPortal(
          <div
            ref={panelRef}
            data-erp-source-combobox-portal=""
            role="listbox"
            id={listboxId}
            className="pointer-events-auto fixed z-[200] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--popover)] text-[var(--popover-foreground)] shadow-[var(--shadow-lg)]"
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-[var(--border-subtle)] p-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                  aria-hidden
                />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={t("crm.assigneeSearch")}
                  className="h-9 w-full cursor-text rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] pe-3 ps-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                  aria-activedescendant={
                    options[activeIndex] ? `${listboxId}-${options[activeIndex].id}` : undefined
                  }
                />
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {loading && (
                <p className="px-3 py-4 text-sm text-[var(--muted)]">{t("common.loading")}</p>
              )}

              {!loading && fetchError && (
                <div className="space-y-2 px-3 py-4">
                  <p className="text-sm text-[var(--muted)]">{fetchError}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => void refetch()}
                  >
                    {t("common.retry")}
                  </Button>
                </div>
              )}

              {!loading && !fetchError && options.length === 0 && (
                <p className="px-3 py-4 text-sm text-[var(--muted)]">{t("crm.sourceEmpty")}</p>
              )}

              {!loading && !fetchError && options.length > 0 && (
                <ul>
                  {options.map((option, index) => {
                    const active = index === activeIndex;
                    const selected = option.id === value;
                    return (
                      <li key={option.id}>
                        <button
                          type="button"
                          id={`${listboxId}-${option.id}`}
                          role="option"
                          aria-selected={selected}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() => selectOption(option)}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-start transition-colors",
                            active && "bg-[var(--muted-bg)]",
                            selected && "bg-[var(--accent-muted)]/50"
                          )}
                        >
                          <PersonAvatar
                            name={option.name}
                            source={{
                              kind: "user",
                              userId: option.id,
                              hasAvatar: option.hasAvatar,
                              avatarUpdatedAt: option.avatarUpdatedAt,
                            }}
                            size="xs"
                            presence={{
                              lastSeenAt: option.lastSeenAt,
                              lastActiveAt: option.lastActiveAt,
                            }}
                            lazy={false}
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{option.name}</span>
                            <span className="block truncate text-xs text-[var(--muted)]">
                              {option.role ?? option.email ?? "—"}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  const trigger = (
    <div className="relative">
      <button
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        aria-busy={pending || undefined}
        aria-disabled={busy || undefined}
        disabled={busy}
        onClick={() => !busy && setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "box-border flex h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-0 text-start text-sm leading-none transition-colors",
          "hover:border-[var(--sidebar-active-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
          open && "border-[var(--accent)] ring-2 ring-[var(--ring)]",
          error && "border-[var(--destructive)]",
          busy && "cursor-not-allowed opacity-60"
        )}
      >
        {selectedOption ? (
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <PersonAvatar
              name={selectedOption.name}
              source={{
                kind: "user",
                userId: selectedOption.id,
                hasAvatar: selectedOption.hasAvatar,
                avatarUpdatedAt: selectedOption.avatarUpdatedAt,
              }}
              size="xs"
              presence={{
                lastSeenAt: selectedOption.lastSeenAt,
                lastActiveAt: selectedOption.lastActiveAt,
              }}
              lazy={false}
            />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{selectedOption.name}</span>
              {selectedOption.role && (
                <span className="block truncate text-xs text-[var(--muted)]">
                  {selectedOption.role}
                </span>
              )}
            </span>
          </span>
        ) : (
          <span className="flex-1 truncate text-sm text-[var(--muted)]">
            {placeholder ?? t("crm.assigneeSearch")}
          </span>
        )}

        <span className="flex shrink-0 items-center gap-1 text-[var(--muted)]">
          {!required && selectedOption && !pending && (
            <button
              type="button"
              className="cursor-pointer rounded p-0.5 hover:bg-[var(--muted-bg)] hover:text-[var(--foreground)]"
              aria-label={t("common.clear")}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onChange(null);
              }}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          )}
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ChevronsUpDown className="h-4 w-4" aria-hidden />
          )}
        </span>
      </button>
      {pending ? (
        <span className="sr-only" role="status">
          {pendingText}
        </span>
      ) : null}
      {panel}
    </div>
  );

  if (!label) return trigger;

  return (
    <FormField label={label} htmlFor={id} error={error} required={required}>
      {trigger}
    </FormField>
  );
}
