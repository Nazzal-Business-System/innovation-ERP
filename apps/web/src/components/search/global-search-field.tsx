"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { GlobalSearchResult, SearchResultModule, SearchScopeFilter } from "@ierp/shared";
import {
  BookOpen,
  Boxes,
  Building2,
  Clock,
  ContactRound,
  FileText,
  FolderKanban,
  Headphones,
  LayoutGrid,
  LifeBuoy,
  Loader2,
  Navigation,
  Package,
  Receipt,
  Search,
  SearchX,
  ShoppingCart,
  Target,
  TrendingUp,
  Truck,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MIN_SEARCH_LENGTH, useGlobalSearch } from "@/lib/hooks/use-search";
import { useI18n } from "@/lib/i18n";
import { useNavigation } from "@/lib/navigation-context";
import { highlightMatch } from "@/lib/search/highlight";
import {
  addRecentSearchForUser,
  clearRecentSearchesForUser,
  getRecentSearchesForUser,
  removeRecentSearchForUser,
  useRecentSearchIdentity,
} from "@/lib/search/recent-searches";
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, LucideIcon> = {
  nav_item: Navigation,
  product: Package,
  warehouse: Boxes,
  customer: Users,
  vendor: Building2,
  sales_order: ShoppingCart,
  purchase_order: Truck,
  delivery: Truck,
  goods_receipt: Boxes,
  transfer: Boxes,
  customer_invoice: Receipt,
  vendor_bill: Receipt,
  customer_payment: Receipt,
  vendor_payment: Receipt,
  employee: Users,
  department: Building2,
  position: Users,
  leave_request: Users,
  payroll_run: Users,
  account: Receipt,
  journal_entry: Receipt,
  project: FolderKanban,
  project_task: FolderKanban,
  support_ticket: LifeBuoy,
  document: FileText,
  knowledge_article: BookOpen,
  lead: ContactRound,
  opportunity: TrendingUp,
  activity: Target,
};

const MODULE_ICONS: Record<SearchResultModule, LucideIcon> = {
  NAVIGATION: LayoutGrid,
  PROJECTS: FolderKanban,
  HR: Users,
  CRM: Target,
  INVENTORY: Boxes,
  OPERATIONS: Truck,
  SALES: ShoppingCart,
  PROCUREMENT: Truck,
  FINANCE: Receipt,
  ACCOUNTING: Receipt,
  SUPPORT: Headphones,
  DOCUMENTS: FileText,
  KNOWLEDGE: BookOpen,
  REPORTS: FileText,
};

const SCOPE_FILTERS: SearchScopeFilter[] = ["all", "navigation", "records", "documents", "people"];

interface GlobalSearchContextValue {
  focusSearch: () => void;
  registerFocusHandler: (handler: () => void) => void;
}

const GlobalSearchContext = createContext<GlobalSearchContextValue | null>(null);

export function GlobalSearchProvider({ children }: { children: React.ReactNode }) {
  const focusHandlerRef = useRef<(() => void) | null>(null);

  const registerFocusHandler = useCallback((handler: () => void) => {
    focusHandlerRef.current = handler;
  }, []);

  const focusSearch = useCallback(() => {
    focusHandlerRef.current?.();
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        focusHandlerRef.current?.();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const value = useMemo(
    () => ({ focusSearch, registerFocusHandler }),
    [focusSearch, registerFocusHandler]
  );

  return <GlobalSearchContext.Provider value={value}>{children}</GlobalSearchContext.Provider>;
}

export function useGlobalSearchFocus() {
  const ctx = useContext(GlobalSearchContext);
  if (!ctx) throw new Error("useGlobalSearchFocus must be used within GlobalSearchProvider");
  return ctx;
}

function entityLabel(result: GlobalSearchResult, t: (k: string, f?: string) => string): string {
  if (result.kind === "navigation") return t("search.entity.nav");
  return result.entityType.replace(/_/g, " ");
}

interface GlobalSearchFieldProps {
  className?: string;
}

export function GlobalSearchField({ className }: GlobalSearchFieldProps) {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigation();
  const { registerFocusHandler } = useGlobalSearchFocus();
  const { organizationId, userId } = useRecentSearchIdentity();
  const listboxId = useId();
  const optionId = (index: number) => `${listboxId}-opt-${index}`;

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const activeOptionRef = useRef<HTMLButtonElement | null>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<SearchScopeFilter>("all");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);

  const trimmedQuery = query.trim();
  const searchEnabled = open && trimmedQuery.length >= MIN_SEARCH_LENGTH;
  const { data, loading, error } = useGlobalSearch(query, searchEnabled, scope);

  /** Flat list in display order (grouped) so keyboard index matches UI. */
  const selectableResults = useMemo(() => {
    if (!data?.grouped?.length) return data?.results ?? [];
    return data.grouped.flatMap((g) => g.results);
  }, [data]);

  const totalResults = selectableResults.length;

  const openDropdown = useCallback(() => {
    setRecent(getRecentSearchesForUser(organizationId, userId));
    setOpen(true);
  }, [organizationId, userId]);

  const closeDropdown = useCallback(() => {
    setOpen(false);
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    const handler = () => {
      inputRef.current?.focus();
      openDropdown();
    };
    registerFocusHandler(handler);
    return () => registerFocusHandler(() => {});
  }, [registerFocusHandler, openDropdown]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, data, scope]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        closeDropdown();
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open, closeDropdown]);

  useEffect(() => {
    activeOptionRef.current?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, selectableResults]);

  function navigateTo(result: GlobalSearchResult) {
    addRecentSearchForUser(organizationId, userId, trimmedQuery || result.title);
    closeDropdown();
    setQuery("");
    inputRef.current?.blur();
    startNavigation(result.route);
    router.push(result.route);
  }

  function prefetch(route: string) {
    try {
      router.prefetch(route);
    } catch {
      /* ignore */
    }
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const max = Math.max(selectableResults.length - 1, 0);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) openDropdown();
      setActiveIndex((i) => Math.min(i + 1, max));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Home" && selectableResults.length) {
      e.preventDefault();
      setActiveIndex(0);
    } else if (e.key === "End" && selectableResults.length) {
      e.preventDefault();
      setActiveIndex(max);
    } else if (e.key === "Enter" && selectableResults[activeIndex]) {
      e.preventDefault();
      navigateTo(selectableResults[activeIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
      inputRef.current?.blur();
    }
  }

  function clearQuery() {
    setQuery("");
    setActiveIndex(0);
    inputRef.current?.focus();
    openDropdown();
  }

  function clearAllRecent() {
    setRecent(clearRecentSearchesForUser(organizationId, userId));
  }

  function removeRecent(item: string) {
    setRecent(removeRecentSearchForUser(organizationId, userId, item));
  }

  const [isApple, setIsApple] = useState(false);
  useEffect(() => {
    setIsApple(/Mac|iPhone|iPad/.test(navigator.userAgent));
  }, []);

  const showRecent = open && !trimmedQuery && recent.length > 0;
  const showResults = open && trimmedQuery.length > 0;
  const showEmpty = showResults && !loading && totalResults === 0 && !error;
  const showPanel = open;
  const shortcutLabel = isApple ? "⌘K" : t("search.shortcut");

  let resultOffset = 0;

  return (
    <div ref={containerRef} className={cn("relative w-full min-w-0", className)}>
      <div
        className={cn(
          "relative flex h-10 w-full items-center rounded-lg border transition-all duration-200",
          open
            ? "border-[var(--sidebar-active-border)] bg-[var(--card)] shadow-[0_0_0_2px_var(--accent-muted)]"
            : "border-[var(--border-subtle)] bg-[var(--muted-bg)]/40 hover:border-[var(--border)] hover:bg-[var(--card)]"
        )}
      >
        <Search
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
          aria-hidden
        />
        <input
          ref={inputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            openDropdown();
          }}
          onFocus={openDropdown}
          onKeyDown={onInputKeyDown}
          placeholder={t("search.placeholder")}
          aria-label={t("search.title")}
          aria-expanded={showPanel}
          aria-controls={showPanel ? listboxId : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            showPanel && selectableResults[activeIndex]
              ? optionId(activeIndex)
              : undefined
          }
          role="combobox"
          className={cn(
            "h-full w-full bg-transparent text-sm text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]",
            "ps-9",
            query ? "pe-9" : "pe-[4.5rem] max-sm:pe-9"
          )}
        />
        {query ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute end-1 top-1/2 h-7 w-7 -translate-y-1/2 cursor-pointer text-[var(--muted)] hover:text-[var(--foreground)]"
            onClick={clearQuery}
            aria-label={t("search.clear")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <kbd className="pointer-events-none absolute end-2 top-1/2 hidden -translate-y-1/2 rounded border border-[var(--border-subtle)] bg-[var(--background)]/80 px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)] sm:inline">
            {shortcutLabel}
          </kbd>
        )}
      </div>

      {showPanel && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={t("search.title")}
          className={cn(
            "absolute top-[calc(100%+6px)] z-50 w-full max-w-[min(100vw-1.5rem,40rem)] overflow-hidden rounded-xl border border-[var(--border-subtle)]",
            "bg-[var(--card)] shadow-[var(--shadow-lg)]",
            "start-0"
          )}
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-3 py-2">
            <div className="min-w-0 text-xs text-[var(--muted)]">
              {loading && trimmedQuery ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--accent)]" aria-hidden />
                  {t("search.loading")}
                </span>
              ) : showResults && totalResults > 0 ? (
                <span>{t("search.resultCount").replace("{count}", String(totalResults))}</span>
              ) : showRecent ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-[var(--foreground)]">
                  <Clock className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
                  {t("search.recent")}
                </span>
              ) : showEmpty ? (
                <span>{t("search.empty")}</span>
              ) : !trimmedQuery ? (
                <span>{t("search.typeToSearch")}</span>
              ) : null}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 shrink-0 cursor-pointer gap-1.5 px-2 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
              onClick={() => {
                closeDropdown();
                inputRef.current?.blur();
              }}
              aria-label={t("search.close")}
            >
              <kbd className="rounded border border-[var(--border-subtle)] px-1.5 py-0.5 text-[10px] leading-none">
                Esc
              </kbd>
            </Button>
          </div>

          {trimmedQuery ? (
            <div className="flex flex-wrap gap-1 border-b border-[var(--border-subtle)] px-3 py-2">
              {SCOPE_FILTERS.map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setScope(filter)}
                  className={cn(
                    "cursor-pointer rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                    scope === filter
                      ? "bg-[var(--accent-muted)] text-[var(--accent)]"
                      : "text-[var(--muted)] hover:bg-[var(--muted-bg)] hover:text-[var(--foreground)]"
                  )}
                >
                  {t(`search.filter.${filter}`)}
                </button>
              ))}
            </div>
          ) : null}

          <div
            ref={listRef}
            className="max-h-[min(70vh,420px)] overflow-y-auto overscroll-contain p-1.5"
          >
            {showRecent && (
              <div className="space-y-2 px-1 pb-1">
                <div className="flex items-center justify-between gap-2 px-1">
                  <span className="text-[11px] font-medium text-[var(--muted)]">
                    {t("search.recent")}
                  </span>
                  <button
                    type="button"
                    className="cursor-pointer text-[11px] font-medium text-[var(--accent)] hover:underline"
                    onClick={clearAllRecent}
                  >
                    {t("search.clearRecent")}
                  </button>
                </div>
                <ul className="space-y-0.5">
                  {recent.map((item) => (
                    <li key={item} className="group flex items-center gap-1">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-start text-sm hover:bg-[var(--muted-bg)]/70"
                        onClick={() => {
                          setQuery(item);
                          openDropdown();
                          inputRef.current?.focus();
                        }}
                      >
                        <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
                        <span className="truncate">{item}</span>
                      </button>
                      <button
                        type="button"
                        className="me-1 rounded-md p-1.5 text-[var(--muted)] opacity-0 hover:bg-[var(--muted-bg)] hover:text-[var(--foreground)] group-hover:opacity-100"
                        aria-label={t("search.removeRecent")}
                        onClick={() => removeRecent(item)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {open && !trimmedQuery && !showRecent && (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--accent-muted)]">
                  <Search className="h-5 w-5 text-[var(--accent)]" aria-hidden />
                </div>
                <p className="text-sm text-[var(--muted)]">{t("search.typeToSearch")}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">{t("search.suggestions")}</p>
              </div>
            )}

            {error && showResults && (
              <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
                <p className="text-sm text-[var(--muted)]">{t("search.error")}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => {
                    setQuery((q) => `${q}`);
                    openDropdown();
                  }}
                >
                  {t("search.retry")}
                </Button>
              </div>
            )}

            {showEmpty && (
              <div className="flex flex-col items-center justify-center px-6 py-10 text-center">
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--muted-bg)]">
                  <SearchX className="h-6 w-6 text-[var(--muted)]" aria-hidden />
                </div>
                <p className="text-sm font-medium">
                  {t("search.noResultsTitle").replace("{query}", trimmedQuery)}
                </p>
                <p className="mt-1 max-w-xs text-xs text-[var(--muted)]">
                  {t("search.noResultsHint")}
                </p>
              </div>
            )}

            {!loading &&
              showResults &&
              (data?.grouped ?? []).map((group) => {
                const GroupIcon = MODULE_ICONS[group.module] ?? FileText;
                const groupStart = resultOffset;
                resultOffset += group.results.length;
                return (
                  <div key={group.module} className="mb-2 last:mb-0">
                    <div className="sticky top-0 z-10 bg-[var(--card)] px-2 pb-1 pt-1">
                      <div className="flex items-center gap-2">
                        <GroupIcon className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
                        <span className="text-[11px] font-semibold tracking-wide text-[var(--foreground)]">
                          {group.label}
                        </span>
                        <Badge variant="secondary" className="ms-auto text-[10px] tabular-nums">
                          {group.totalInGroup ?? group.results.length}
                        </Badge>
                      </div>
                      <div className="mt-1.5 h-px bg-[var(--border-subtle)]" />
                    </div>
                    <ul className="mt-0.5 space-y-0.5">
                      {group.results.map((result, idx) => {
                        const globalIdx = groupStart + idx;
                        const Icon = TYPE_ICONS[result.iconKey ?? result.entityType] ?? FileText;
                        const isActive = globalIdx === activeIndex;
                        const code = result.code || (result.kind === "navigation" ? null : result.subtitle);
                        return (
                          <li key={`${result.entityType}-${result.id}`}>
                            <button
                              ref={isActive ? activeOptionRef : undefined}
                              type="button"
                              id={optionId(globalIdx)}
                              role="option"
                              aria-selected={isActive}
                              onMouseEnter={() => {
                                setActiveIndex(globalIdx);
                                prefetch(result.route);
                              }}
                              onClick={() => navigateTo(result)}
                              className={cn(
                                "flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-start transition-colors",
                                isActive
                                  ? "bg-[var(--accent-muted)] ring-1 ring-[var(--sidebar-active-border)]/40"
                                  : "hover:bg-[var(--muted-bg)]/70"
                              )}
                            >
                              <div
                                className={cn(
                                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--border-subtle)]",
                                  isActive ? "bg-[var(--card)]" : "bg-[var(--muted-bg)]/60"
                                )}
                              >
                                <Icon className="h-3.5 w-3.5 text-[var(--accent)]" aria-hidden />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-center gap-2">
                                  <p className="truncate text-sm font-medium text-[var(--foreground)]">
                                    {highlightMatch(result.title, query)}
                                  </p>
                                  {result.status ? (
                                    <Badge variant="secondary" className="shrink-0 text-[9px]">
                                      {result.status.replace(/_/g, " ")}
                                    </Badge>
                                  ) : null}
                                  {result.metadata?.lifecycle === "Protected" ? (
                                    <Badge variant="warning" className="shrink-0 text-[9px]">
                                      {t("masterData.protected")}
                                    </Badge>
                                  ) : null}
                                </div>
                                <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-[var(--muted)]">
                                  {code ? (
                                    <span className="ew-ltr-isolate font-mono">
                                      {highlightMatch(code, query)}
                                    </span>
                                  ) : null}
                                  <span className="truncate capitalize">
                                    {entityLabel(result, t)}
                                  </span>
                                  {result.matchedSnippet &&
                                  result.matchedField &&
                                  result.matchedField !== "title" &&
                                  result.matchedSnippet !== result.title &&
                                  result.matchedSnippet !== code ? (
                                    <span className="truncate">
                                      {highlightMatch(result.matchedSnippet, query)}
                                    </span>
                                  ) : result.subtitle && result.subtitle !== code ? (
                                    <span className="truncate">
                                      {highlightMatch(result.subtitle, query)}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
          </div>

          <div className="border-t border-[var(--border-subtle)] bg-[var(--muted-bg)]/30 px-3 py-1.5 text-[10px] text-[var(--muted)]">
            {t("search.footerHint")}
          </div>
        </div>
      )}
    </div>
  );
}
