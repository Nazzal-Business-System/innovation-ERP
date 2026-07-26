"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  type ReactNode,
  type UIEvent,
} from "react";
import {
  Bell,
  ArrowRightLeft,
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Banknote,
  BookOpen,
  Boxes,
  Briefcase,
  Building2,
  Calculator,
  ContactRound,
  ChevronRight,
  Target,
  CalendarClock,
  ClipboardList,
  FileText,
  Flag,
  FolderKanban,
  FolderOpen,
  GitBranch,
  Headphones,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  UserCheck,
  Users,
  type LucideIcon,
  Scale,
  TrendingUp,
} from "lucide-react";
import { NAV_GROUPS } from "@ierp/shared";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { useNavigation } from "@/lib/navigation-context";
import { useI18n, useNavLabel, useRoleLabel } from "@/lib/i18n";
import { canAccessNavItem, canAccessSettings } from "@/lib/nav-permissions";
import { isEmployeeSelfServiceUser } from "@/lib/auth-home-route";
import {
  EMPLOYEE_SETTINGS_HREF,
  isNavItemActive,
  pathMatchesNavHref,
  PROFILE_HREF,
  SETTINGS_HREF,
} from "@/lib/nav-active";
import {
  ensureActiveNavVisible,
  restoreSidebarScrollTop,
  setSidebarScrollTop,
  type SidebarScrollVariant,
} from "@/lib/sidebar-scroll";
import { isNavItemPinnable, useSidebarPinsStore } from "@/lib/sidebar-pins-store";
import {
  CanonicalNavRow,
  CollapsedNavPinMenu,
  NavItemPinButton,
  SidebarPinnedSection,
} from "@/components/layout/sidebar-pins";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSidebarCollapsed, useSidebarStore } from "@/lib/sidebar-store";
import { SidebarNavLink } from "./sidebar-nav-link";
import { UserAvatar } from "@/components/auth/user-avatar";

const SCROLLABLE_GROUPS = NAV_GROUPS;

const GROUP_ICONS: Record<string, LucideIcon> = {
  executive: LayoutDashboard,
  accounting: Calculator,
  finance: Banknote,
  operations: GitBranch,
  inventory: Boxes,
  procurement: Truck,
  sales: ShoppingCart,
  crm: Target,
  projects: FolderKanban,
  support: Headphones,
  documents: FolderOpen,
  knowledge: BookOpen,
  hr: Users,
  "my-workspace": Briefcase,
  reports: BarChart3,
};

const ITEM_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  notifications: Bell,
  "accounting-overview": Calculator,
  "accounting-chart": BookOpen,
  "accounting-journal": FileText,
  "accounting-trial-balance": Scale,
  "finance-overview": Banknote,
  "finance-customer-invoices": FileText,
  "finance-customer-payments": ArrowDownToLine,
  "finance-vendor-bills": Receipt,
  "finance-vendor-payments": ArrowUpFromLine,
  "finance-ar-aging": BarChart3,
  "finance-ap-aging": BarChart3,
  "operations-overview": GitBranch,
  "operations-goods-receipts": ArrowDownToLine,
  "operations-deliveries": ArrowUpFromLine,
  "inventory-overview": Boxes,
  "inventory-products": Package,
  "inventory-warehouses": Building2,
  "inventory-movements": ArrowRightLeft,
  "inventory-reservations": ClipboardList,
  "inventory-transfers": Truck,
  "procurement-overview": Truck,
  "procurement-vendors": Building2,
  "procurement-purchase-orders": Package,
  "sales-overview": ShoppingCart,
  "sales-customers": Users,
  "sales-orders": ClipboardList,
  "crm-overview": Target,
  "crm-leads": ContactRound,
  "crm-opportunities": TrendingUp,
  "crm-activities": CalendarClock,
  "projects-overview": FolderKanban,
  "projects-tasks": ClipboardList,
  "projects-milestones": Flag,
  "support-overview": Headphones,
  "support-tickets": LifeBuoy,
  "support-categories": ClipboardList,
  "documents-overview": FolderOpen,
  "documents-files": FileText,
  "documents-categories": ClipboardList,
  "documents-expiring": CalendarClock,
  "knowledge-overview": BookOpen,
  "knowledge-articles": FileText,
  "knowledge-categories": ClipboardList,
  "knowledge-tags": Tags,
  "hr-overview": Users,
  "hr-employees": Users,
  "hr-departments": Building2,
  "hr-attendance": UserCheck,
  "hr-leave": CalendarClock,
  "hr-payroll": Banknote,
  "hr-contracts": FileText,
  "hr-documents": FolderOpen,
  "hr-positions": Briefcase,
  "my-overview": LayoutDashboard,
  "my-profile": ContactRound,
  "my-attendance": CalendarClock,
  "my-leave": ClipboardList,
  "my-payroll": Banknote,
  "my-contract": FileText,
  "my-documents": FolderOpen,
  "my-knowledge": BookOpen,
  "my-company-documents": Briefcase,
  "my-notifications": Bell,
  "my-settings": Settings,
  "reports-overview": BarChart3,
  "reports-sales": ShoppingCart,
  "reports-inventory": Boxes,
  "reports-procurement": Truck,
  "reports-financial": Calculator,
  "reports-projects": FolderKanban,
  "reports-support": LifeBuoy,
  "reports-documents": FileText,
};

interface AppSidebarProps {
  mobileOpen: boolean;
  onMobileClose: () => void;
}

function SidebarScrollRegion({
  variant,
  dir,
  pathname,
  ensureActiveOnMount = false,
  children,
}: {
  variant: SidebarScrollVariant;
  dir: string;
  pathname: string;
  /** Mobile drawer only — reveal active leaf if it was scrolled out of view. */
  ensureActiveOnMount?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    restoreSidebarScrollTop(el, variant);
    if (ensureActiveOnMount) {
      ensureActiveNavVisible(el);
      setSidebarScrollTop(variant, el.scrollTop);
    }
  }, [variant, ensureActiveOnMount, pathname]);

  function onScroll(event: UIEvent<HTMLDivElement>) {
    setSidebarScrollTop(variant, event.currentTarget.scrollTop);
  }

  return (
    <div
      ref={ref}
      dir={dir}
      data-sidebar-scroll={variant}
      onScroll={onScroll}
      className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [overflow-anchor:none]"
    >
      {children}
    </div>
  );
}

function NavGroupLabel({ groupId }: { groupId: string }) {
  const label = useNavLabel("", groupId);
  return <>{label}</>;
}

function NavItemLabel({ itemId }: { itemId: string }) {
  const label = useNavLabel(itemId);
  return <>{label}</>;
}

function NavSidebarItem({
  itemId,
  href,
  icon,
  active,
  pending,
  collapsed,
  isRtl,
  onClick,
  pinnable,
}: {
  itemId: string;
  href: string;
  icon: LucideIcon;
  active: boolean;
  pending: boolean;
  collapsed: boolean;
  isRtl: boolean;
  onClick: () => void;
  pinnable: boolean;
}) {
  const label = useNavLabel(itemId);

  const link = (
    <SidebarNavLink
      href={href}
      label={label}
      icon={icon}
      active={active}
      pending={pending}
      collapsed={collapsed}
      isRtl={isRtl}
      onClick={onClick}
      trailingPad={pinnable && !collapsed}
    />
  );

  if (collapsed && pinnable) {
    return (
      <CollapsedNavPinMenu itemId={itemId} isRtl={isRtl}>
        {link}
      </CollapsedNavPinMenu>
    );
  }

  if (!pinnable || collapsed) return link;

  return (
    <CanonicalNavRow>
      {link}
      <NavItemPinButton itemId={itemId} isRtl={isRtl} />
    </CanonicalNavRow>
  );
}

function SidebarPanel({
  onNavigate,
  className,
  collapsed = false,
  scrollVariant = "desktop",
  ensureActiveOnMount = false,
}: {
  onNavigate?: () => void;
  className?: string;
  collapsed?: boolean;
  scrollVariant?: SidebarScrollVariant;
  ensureActiveOnMount?: boolean;
}) {
  const pathname = usePathname();
  const { pendingHref, startNavigation } = useNavigation();
  const { t, dir } = useI18n();
  const organization = useAuthStore((s) => s.organization);
  const roles = useAuthStore((s) => s.roles);
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const logout = useAuthStore((s) => s.logout);
  const roleLabel = useRoleLabel(roles[0]?.code);
  const expandedGroups = useSidebarPinsStore((s) => s.sidebarExpandedGroups);
  const toggleGroup = useSidebarPinsStore((s) => s.toggleGroup);

  const employeeSelfService = isEmployeeSelfServiceUser(permissions);
  /** Employees: Settings pinned in footer → my-workspace/settings. Managers: admin settings. */
  const settingsHref = employeeSelfService ? EMPLOYEE_SETTINGS_HREF : SETTINGS_HREF;
  const showBottomSettings = employeeSelfService || canAccessSettings(permissions);
  const settingsActive = pathMatchesNavHref(pathname, settingsHref);
  const settingsPending = pendingHref === settingsHref;
  const profileActive =
    pathname === PROFILE_HREF ||
    pathname.startsWith(`${PROFILE_HREF}/`) ||
    (employeeSelfService &&
      (pathname === "/dashboard/my-workspace/profile" ||
        pathname.startsWith("/dashboard/my-workspace/profile/")));
  const profilePending =
    pendingHref === PROFILE_HREF ||
    (employeeSelfService && pendingHref === "/dashboard/my-workspace/profile");
  const isRtl = dir === "rtl";
  const textAlign = isRtl ? "text-right" : "text-left";

  const orgInitials = organization?.name
    ?.split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  function handleNavClick(href: string) {
    if (href === pathname) return;
    startNavigation(href);
    onNavigate?.();
  }

  return (
    <div
      dir={dir}
      data-sidebar-rtl={isRtl ? "true" : undefined}
      className={cn("flex h-full w-full flex-col bg-[var(--sidebar)]", isRtl && "ierp-sidebar-rtl", className)}
    >
      <div className={cn("shrink-0 border-b border-[var(--sidebar-border)] p-4", collapsed && "px-2 py-3")}>
        <div className={cn("ierp-sidebar-org-row flex items-center gap-3", collapsed && "justify-center")}>
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--muted-bg)] text-sm font-bold text-[var(--accent)] shadow-[var(--shadow-sm)]">
            {orgInitials ?? "AN"}
            <span
              className="absolute -bottom-0.5 end-0 h-2.5 w-2.5 rounded-full border-2 border-[var(--sidebar)] bg-[var(--success)]"
              aria-hidden
            />
          </div>
          {!collapsed && (
          <div className={cn("ierp-sidebar-text-block min-w-0 flex-1", textAlign)}>
            <p className="truncate text-sm font-semibold tracking-tight text-[var(--sidebar-foreground)]">
              {t("app.name")}
            </p>
            <p className="truncate text-xs text-[var(--muted-foreground)]">{organization?.name}</p>
          </div>
          )}
        </div>
      </div>

      <SidebarScrollRegion
        variant={scrollVariant}
        dir={dir}
        pathname={pathname}
        ensureActiveOnMount={ensureActiveOnMount}
      >
        <nav className="space-y-0.5 px-3 py-4" aria-label={t("nav.mainNavigation")}>
          <SidebarPinnedSection
            collapsed={collapsed}
            isRtl={isRtl}
            pathname={pathname}
            pendingHref={pendingHref}
            icons={ITEM_ICONS}
            onNavigate={handleNavClick}
          />
          {SCROLLABLE_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) =>
              canAccessNavItem(item.id, permissions)
            );
            if (visibleItems.length === 0) return null;

            const GroupIcon = GROUP_ICONS[group.id] ?? LayoutDashboard;
            const isExpanded = expandedGroups.includes(group.id);
            /**
             * Icon-only rail has no labels/headers, so collapsible grouping is
             * meaningless there — always show item icons (with per-item tooltips).
             * When labels are visible, children mount only while the group is expanded.
             */
            const showChildren = collapsed || isExpanded;
            const listId = `ierp-nav-group-${group.id}`;

            const list = (
              <ul
                id={listId}
                className={cn("space-y-0.5", !collapsed && "ierp-nav-group-children")}
              >
                {visibleItems.map((item) => {
                  const ItemIcon = ITEM_ICONS[item.id] ?? GroupIcon;
                  const isActive = isNavItemActive(item.href, pathname);
                  const isPending = pendingHref === item.href;
                  const isDisabled = String(item.href) === "#";
                  const pinnable = isNavItemPinnable(item.id, item.href, permissions);

                  if (isDisabled) {
                    return (
                      <li key={item.id}>
                        <span
                          className="ierp-nav-row flex cursor-not-allowed select-none items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--muted-foreground)] opacity-70"
                          title={t("nav.comingSoon")}
                          aria-disabled="true"
                        >
                          <ItemIcon className="ierp-nav-icon h-4 w-4 shrink-0 opacity-40" aria-hidden />
                          <span className={cn("ierp-nav-label min-w-0 flex-1 truncate", textAlign)}>
                            <NavItemLabel itemId={item.id} />
                          </span>
                          <span
                            className={cn(
                              "shrink-0 rounded-md border border-[var(--border-subtle)] px-1.5 py-0.5 text-[9px] font-medium",
                              isRtl ? "normal-case" : "uppercase tracking-wide"
                            )}
                          >
                            {t("nav.soon")}
                          </span>
                        </span>
                      </li>
                    );
                  }

                  return (
                    <li key={item.id}>
                      <NavSidebarItem
                        itemId={item.id}
                        href={item.href}
                        icon={ItemIcon}
                        active={isActive}
                        pending={isPending}
                        collapsed={collapsed}
                        isRtl={isRtl}
                        pinnable={pinnable}
                        onClick={() => handleNavClick(item.href)}
                      />
                    </li>
                  );
                })}
              </ul>
            );

            return (
              <div key={group.id} className="ierp-sidebar-group space-y-1">
                {!collapsed && (
                  <h3 className="m-0 px-1">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      aria-controls={listId}
                      onClick={() => toggleGroup(group.id)}
                      className={cn(
                        "ierp-sidebar-group-header ierp-focus-ring flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] font-semibold text-[var(--muted-foreground)] transition-colors hover:bg-[var(--muted-bg)]/60 hover:text-[var(--sidebar-foreground)]"
                      )}
                    >
                      <GroupIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      <span
                        className={cn(
                          "min-w-0 flex-1 truncate",
                          textAlign,
                          isRtl ? "tracking-normal normal-case" : "uppercase tracking-[0.14em]"
                        )}
                      >
                        <NavGroupLabel groupId={group.id} />
                      </span>
                      <ChevronRight
                        className={cn(
                          "h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200",
                          isExpanded ? "rotate-90" : isRtl ? "rotate-180" : "rotate-0"
                        )}
                        aria-hidden
                      />
                    </button>
                  </h3>
                )}
                {showChildren && list}
              </div>
            );
          })}
        </nav>
      </SidebarScrollRegion>

      <div dir={dir} className={cn("shrink-0 space-y-1 border-t border-[var(--sidebar-border)] bg-[var(--sidebar)] p-3", collapsed && "px-2")}>
        {user && (collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={PROFILE_HREF}
                onClick={() => handleNavClick(PROFILE_HREF)}
                aria-current={profileActive ? "page" : undefined}
                className={cn(
                  "ierp-nav-link group justify-center rounded-xl border border-transparent px-2 transition-all hover:scale-[1.03] hover:border-[var(--border-subtle)] hover:shadow-sm",
                  profileActive && "ierp-nav-link-active border-[var(--border-subtle)]"
                )}
              >
                <UserAvatar size="sm" showPresence />
              </Link>
            </TooltipTrigger>
            <TooltipContent side={isRtl ? "left" : "right"}>
              <p className="font-medium">{user.name}</p>
              <p className="text-[10px] text-[var(--muted-foreground)]">{roleLabel}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href={PROFILE_HREF}
            onClick={() => handleNavClick(PROFILE_HREF)}
            aria-current={profileActive ? "page" : undefined}
            className={cn(
              "ierp-nav-link group relative min-h-[3.25rem] w-full rounded-xl border border-transparent bg-[var(--muted-bg)]/35 px-2.5 transition-all hover:-translate-y-px hover:border-[var(--border-subtle)] hover:bg-[var(--muted-bg)] hover:shadow-sm",
              profileActive && "ierp-nav-link-active border-[var(--border-subtle)] bg-[var(--muted-bg)]",
              profilePending && !profileActive && "ierp-nav-link-pending"
            )}
          >
            {profileActive && (
              <span
                className={cn(
                  "ierp-nav-indicator absolute top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent)]",
                  isRtl ? "right-0 left-auto" : "left-0"
                )}
                aria-hidden
              />
            )}
            <UserAvatar size="sm" className="shrink-0" showPresence />
            <span className={cn("ierp-sidebar-text-block min-w-0 flex-1", textAlign)}>
              <span className="block truncate text-xs font-semibold leading-tight text-[var(--sidebar-foreground)]">
                {user.name}
              </span>
              <span className="block truncate text-[10px] leading-tight text-[var(--muted-foreground)]">
                {roleLabel}
                {user.email ? ` · ${user.email}` : ""}
              </span>
            </span>
            <ChevronRight
              className="h-3.5 w-3.5 shrink-0 text-[var(--muted-foreground)] opacity-60 transition-transform group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5"
              aria-hidden
            />
          </Link>
        ))}
        {user && <div className="my-1 h-px bg-[var(--sidebar-border)]" aria-hidden />}
        {showBottomSettings && (collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={settingsHref}
                onClick={() => handleNavClick(settingsHref)}
                aria-current={settingsActive ? "page" : undefined}
                className={cn("ierp-nav-link justify-center px-2", settingsActive && "ierp-nav-link-active")}
              >
                <Settings className={cn("h-4 w-4", settingsActive ? "text-[var(--accent)]" : "opacity-70")} aria-hidden />
              </Link>
            </TooltipTrigger>
            <TooltipContent side={isRtl ? "left" : "right"}>{t("nav.settings")}</TooltipContent>
          </Tooltip>
        ) : (
        <Link
          href={settingsHref}
          onClick={() => handleNavClick(settingsHref)}
          aria-current={settingsActive ? "page" : undefined}
          className={cn(
            "ierp-nav-link relative w-full",
            settingsActive && "ierp-nav-link-active",
            settingsPending && !settingsActive && "ierp-nav-link-pending"
          )}
        >
          {settingsActive && (
            <span
              className={cn(
                "ierp-nav-indicator absolute top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--accent)]",
                isRtl ? "right-0 left-auto" : "left-0"
              )}
              aria-hidden
            />
          )}
          <Settings
            className={cn("ierp-nav-icon h-4 w-4 shrink-0", settingsActive ? "text-[var(--accent)]" : "opacity-70")}
            aria-hidden
          />
          <span className={cn("ierp-nav-label min-w-0 flex-1 truncate", textAlign)}>
            {t("nav.settings")}
          </span>
        </Link>
        ))}
        {showBottomSettings ? (
          <div className="my-1 h-px bg-[var(--sidebar-border)]" aria-hidden />
        ) : null}
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="ierp-nav-link w-full justify-center px-2 text-[var(--muted)] hover:text-[var(--foreground)]"
                onClick={() => {
                  logout();
                  window.location.href = "/login";
                }}
              >
                <LogOut className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
              </button>
            </TooltipTrigger>
            <TooltipContent side={isRtl ? "left" : "right"}>{t("nav.signOut")}</TooltipContent>
          </Tooltip>
        ) : (
        <button
          type="button"
          className={cn(
            "ierp-nav-link w-full text-[var(--muted)] hover:text-[var(--foreground)]"
          )}
          onClick={() => {
            logout();
            window.location.href = "/login";
          }}
        >
          <LogOut className="ierp-nav-icon h-4 w-4 shrink-0 opacity-70" aria-hidden />
          <span className={cn("ierp-nav-label min-w-0 flex-1 truncate", textAlign)}>{t("nav.signOut")}</span>
        </button>
        )}
      </div>
    </div>
  );
}

export function AppSidebar({ mobileOpen, onMobileClose }: AppSidebarProps) {
  const { dir, t } = useI18n();
  const pathname = usePathname();
  const collapsed = useSidebarCollapsed();
  const mode = useSidebarStore((s) => s.mode);
  const setAutoHovered = useSidebarStore((s) => s.setAutoHovered);
  const ensureGroupExpanded = useSidebarPinsStore((s) => s.ensureGroupExpanded);

  /**
   * Auto-expand the module that owns the active route on navigation (incl. direct
   * refresh and pinned-item clicks). Never collapses other modules; once expanded a
   * module stays open (persisted) until the user collapses it manually.
   */
  useEffect(() => {
    for (const group of NAV_GROUPS) {
      if (group.items.some((item) => isNavItemActive(item.href, pathname))) {
        ensureGroupExpanded(group.id);
        break;
      }
    }
  }, [pathname, ensureGroupExpanded]);

  return (
    <>
      <aside
        className={cn(
          "ierp-sidebar-shell hidden h-full shrink-0 border-e border-[var(--sidebar-border)] transition-[width] duration-200 ease-out lg:block",
          collapsed ? "w-[4.5rem]" : "w-64"
        )}
        onMouseEnter={() => mode === "auto" && setAutoHovered(true)}
        onMouseLeave={() => mode === "auto" && setAutoHovered(false)}
      >
        <SidebarPanel collapsed={collapsed} scrollVariant="desktop" />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="ierp-mobile-drawer-backdrop absolute inset-0 cursor-pointer bg-[var(--overlay)] backdrop-blur-sm"
            onClick={onMobileClose}
            aria-label={t("topbar.closeMenu")}
            data-erp-overlay="mobile-drawer"
          />
          <aside
            className={cn(
              "ierp-mobile-drawer-panel absolute inset-y-0 z-10 w-72 max-w-[85vw] shadow-[var(--shadow-lg)]",
              dir === "rtl" ? "right-0" : "left-0"
            )}
          >
            <SidebarPanel
              onNavigate={onMobileClose}
              scrollVariant="mobile"
              ensureActiveOnMount
            />
          </aside>
        </div>
      )}
    </>
  );
}

