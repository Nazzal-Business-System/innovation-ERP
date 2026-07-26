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
import { Building2, ChevronsUpDown, Search, UserRound, X } from "lucide-react";
import { FormField } from "@/components/forms/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCrmLeads } from "@/lib/hooks/use-crm";
import { useSalesCustomers } from "@/lib/hooks/use-sales";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { CrmLead, SalesCustomer } from "@ierp/shared";

export type OpportunitySource =
  | { kind: "lead"; lead: CrmLead }
  | { kind: "customer"; customer: SalesCustomer }
  | null;

const OPEN_LEAD_STATUSES = new Set(["NEW", "CONTACTED", "QUALIFIED"]);
const LOOKUP_LIMIT = 8;

type FlatOption =
  | { key: string; kind: "lead"; lead: CrmLead; label: string }
  | { key: string; kind: "customer"; customer: SalesCustomer; label: string };

function leadMeta(lead: CrmLead) {
  return [lead.contactName, lead.email || lead.phone, lead.leadNumber]
    .filter(Boolean)
    .join(" · ");
}

function customerMeta(customer: SalesCustomer) {
  return [customer.contactName, customer.email || customer.phone, customer.code]
    .filter(Boolean)
    .join(" · ");
}

export function OpportunitySourceSelector({
  value,
  onChange,
  error,
}: {
  value: OpportunitySource;
  onChange: (value: OpportunitySource) => void;
  error?: string;
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
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: leadsData,
    loading: leadsLoading,
    error: leadsError,
    refetch: refetchLeads,
  } = useCrmLeads({
    search: debounced || undefined,
    page: 1,
  });
  const {
    data: customersData,
    loading: customersLoading,
    error: customersError,
    refetch: refetchCustomers,
  } = useSalesCustomers({
    search: debounced || undefined,
    active: true,
    page: 1,
  });

  const leads = useMemo(
    () =>
      (leadsData?.data ?? [])
        .filter((lead) => OPEN_LEAD_STATUSES.has(lead.status))
        .slice(0, LOOKUP_LIMIT),
    [leadsData]
  );
  const customers = useMemo(
    () => (customersData?.data ?? []).slice(0, LOOKUP_LIMIT),
    [customersData]
  );

  const options = useMemo<FlatOption[]>(() => {
    const leadOpts: FlatOption[] = leads.map((lead) => ({
      key: `lead:${lead.id}`,
      kind: "lead",
      lead,
      label: lead.companyName,
    }));
    const customerOpts: FlatOption[] = customers.map((customer) => ({
      key: `customer:${customer.id}`,
      kind: "customer",
      customer,
      label: customer.name,
    }));
    return [...leadOpts, ...customerOpts];
  }, [leads, customers]);

  const selectedKey =
    value?.kind === "lead"
      ? `lead:${value.lead.id}`
      : value?.kind === "customer"
        ? `customer:${value.customer.id}`
        : null;

  const loading = leadsLoading || customersLoading;
  const lookupError = leadsError || customersError;

  const updatePosition = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.max(rect.width, 320);
    let left = rect.left;
    if (left + width > window.innerWidth - 8) {
      left = Math.max(8, rect.right - width);
    }
    let top = rect.bottom + 6;
    const panelHeight = 360;
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
    const selectedIdx = options.findIndex((o) => o.key === selectedKey);
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);
  }, [open, options, selectedKey]);

  function selectOption(option: FlatOption) {
    if (option.kind === "lead") {
      onChange({ kind: "lead", lead: option.lead });
    } else {
      onChange({ kind: "customer", customer: option.customer });
    }
    setOpen(false);
    setSearch("");
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(e: ReactKeyboardEvent) {
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
                  placeholder={t("crm.sourceSearchPlaceholder")}
                  className="h-9 w-full cursor-text rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] pe-3 ps-8 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                  aria-autocomplete="list"
                  aria-controls={listboxId}
                  aria-activedescendant={
                    options[activeIndex] ? `${listboxId}-${options[activeIndex].key}` : undefined
                  }
                />
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {loading && (
                <p className="px-3 py-4 text-sm text-[var(--muted)]">{t("common.loading")}</p>
              )}

              {!loading && lookupError && (
                <div className="space-y-2 px-3 py-4">
                  <p className="text-sm text-[var(--muted)]">{lookupError}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="cursor-pointer"
                    onClick={() => {
                      void refetchLeads();
                      void refetchCustomers();
                    }}
                  >
                    {t("common.retry")}
                  </Button>
                </div>
              )}

              {!loading && !lookupError && options.length === 0 && (
                <p className="px-3 py-4 text-sm text-[var(--muted)]">{t("crm.sourceEmpty")}</p>
              )}

              {!loading && !lookupError && leads.length > 0 && (
                <div>
                  <p className="sticky top-0 border-b border-[var(--border-subtle)] bg-[var(--muted-bg)]/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] backdrop-blur">
                    {t("crm.sourceLeads")}
                  </p>
                  <ul>
                    {leads.map((lead) => {
                      const optionIndex = options.findIndex((o) => o.key === `lead:${lead.id}`);
                      const active = optionIndex === activeIndex;
                      const selected = selectedKey === `lead:${lead.id}`;
                      return (
                        <li key={lead.id}>
                          <button
                            type="button"
                            id={`${listboxId}-lead:${lead.id}`}
                            role="option"
                            aria-selected={selected}
                            onMouseEnter={() => setActiveIndex(optionIndex)}
                            onClick={() => selectOption({ key: `lead:${lead.id}`, kind: "lead", lead, label: lead.companyName })}
                            className={cn(
                              "flex w-full cursor-pointer items-start gap-3 px-3 py-2.5 text-start transition-colors",
                              active && "bg-[var(--muted-bg)]",
                              selected && "bg-[var(--accent-muted)]/50"
                            )}
                          >
                            <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">
                                {lead.companyName}
                              </span>
                              <span className="block truncate text-xs text-[var(--muted)]">
                                {leadMeta(lead)}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {!loading && !lookupError && customers.length > 0 && (
                <div>
                  <p className="sticky top-0 border-b border-t border-[var(--border-subtle)] bg-[var(--muted-bg)]/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] backdrop-blur">
                    {t("crm.sourceCustomers")}
                  </p>
                  <ul>
                    {customers.map((customer) => {
                      const optionIndex = options.findIndex(
                        (o) => o.key === `customer:${customer.id}`
                      );
                      const active = optionIndex === activeIndex;
                      const selected = selectedKey === `customer:${customer.id}`;
                      return (
                        <li key={customer.id}>
                          <button
                            type="button"
                            id={`${listboxId}-customer:${customer.id}`}
                            role="option"
                            aria-selected={selected}
                            onMouseEnter={() => setActiveIndex(optionIndex)}
                            onClick={() =>
                              selectOption({
                                key: `customer:${customer.id}`,
                                kind: "customer",
                                customer,
                                label: customer.name,
                              })
                            }
                            className={cn(
                              "flex w-full cursor-pointer items-start gap-3 px-3 py-2.5 text-start transition-colors",
                              active && "bg-[var(--muted-bg)]",
                              selected && "bg-[var(--accent-muted)]/50"
                            )}
                          >
                            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden />
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-medium">
                                {customer.name}
                              </span>
                              <span className="block truncate text-xs text-[var(--muted)]">
                                {customerMeta(customer)}
                              </span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <FormField label={t("crm.leadOrCustomer")} htmlFor="opp-source-trigger" error={error} required>
      <div className="relative">
        <button
          ref={triggerRef}
          id="opp-source-trigger"
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-haspopup="listbox"
          onClick={() => setOpen((v) => !v)}
          onKeyDown={handleTriggerKeyDown}
          className={cn(
            "box-border flex min-h-10 w-full cursor-pointer items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2 text-start text-sm leading-5 transition-colors",
            "hover:border-[var(--sidebar-active-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]",
            open && "border-[var(--accent)] ring-2 ring-[var(--ring)]",
            error && "border-[var(--destructive)]"
          )}
        >
          {value ? (
            <span className="flex min-w-0 flex-1 items-start gap-2">
              <Badge variant="outline" className="mt-0.5 shrink-0 text-[10px]">
                {value.kind === "lead" ? t("crm.sourceLead") : t("crm.sourceCustomer")}
              </Badge>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {value.kind === "lead" ? value.lead.companyName : value.customer.name}
                </span>
                <span className="block truncate text-xs text-[var(--muted)]">
                  {value.kind === "lead" ? leadMeta(value.lead) : customerMeta(value.customer)}
                </span>
              </span>
            </span>
          ) : (
            <span className="flex-1 truncate text-sm text-[var(--muted)]">
              {t("crm.sourceSearchPlaceholder")}
            </span>
          )}

          <span className="flex shrink-0 items-center gap-1 text-[var(--muted)]">
            {value && (
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
            <ChevronsUpDown className="h-4 w-4" aria-hidden />
          </span>
        </button>
        {panel}
      </div>
    </FormField>
  );
}

export function defaultOpportunityTitle(source: OpportunitySource): string {
  if (!source) return "";
  const name = source.kind === "lead" ? source.lead.companyName : source.customer.name;
  return `${name} Opportunity`;
}
