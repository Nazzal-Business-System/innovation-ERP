"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { ar } from "./dictionaries/ar";
import { en } from "./dictionaries/en";
import { persistLocale, readStoredLocale } from "./persist-locale";
import type { Locale } from "./types";

const dictionaries = { en, ar } as const;

interface I18nContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (locale: Locale) => void;
  t: (key: string, fallback?: string) => string;
  mounted: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  initialLocale = "en",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = readStoredLocale();
    if (stored !== initialLocale) {
      setLocaleState(stored);
      persistLocale(stored);
    }
    setMounted(true);
  }, [initialLocale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
    document.documentElement.lang = next;
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr";
  }, []);

  const dir: "ltr" | "rtl" = locale === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
  }, [locale, dir, mounted]);

  const t = useCallback(
    (key: string, fallback?: string) => {
      const dict = dictionaries[locale];
      return dict[key] ?? dictionaries.en[key] ?? fallback ?? key;
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, dir, setLocale, t, mounted }),
    [locale, dir, setLocale, t, mounted]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

const NAV_ITEM_KEYS: Record<string, string> = {
  dashboard: "nav.dashboard",
  notifications: "nav.notifications",
  "accounting-overview": "nav.overview",
  "accounting-chart": "nav.chartOfAccounts",
  "accounting-journal": "nav.journalEntries",
  "accounting-trial-balance": "nav.trialBalance",
  "finance-overview": "nav.overview",
  "finance-customer-invoices": "nav.customerInvoices",
  "finance-customer-payments": "nav.customerPayments",
  "finance-vendor-bills": "nav.vendorBills",
  "finance-vendor-payments": "nav.vendorPayments",
  "finance-ar-aging": "nav.arAging",
  "finance-ap-aging": "nav.apAging",
  "inventory-overview": "nav.overview",
  "inventory-products": "nav.products",
  "inventory-warehouses": "nav.warehouses",
  "inventory-movements": "nav.movements",
  "inventory-reservations": "nav.reservations",
  "inventory-transfers": "nav.transfers",
  "procurement-overview": "nav.overview",
  "procurement-vendors": "nav.vendors",
  "procurement-purchase-orders": "nav.purchaseOrders",
  "operations-overview": "nav.overview",
  "operations-goods-receipts": "nav.goodsReceipts",
  "operations-deliveries": "nav.deliveries",
  "sales-overview": "nav.overview",
  "sales-customers": "nav.customers",
  "sales-orders": "nav.salesOrders",
  "crm-overview": "nav.overview",
  "crm-leads": "nav.leads",
  "crm-opportunities": "nav.opportunities",
  "crm-activities": "nav.crmActivities",
  "projects-overview": "nav.overview",
  "projects-tasks": "nav.tasks",
  "projects-milestones": "nav.milestones",
  "support-overview": "nav.overview",
  "support-tickets": "nav.tickets",
  "support-categories": "nav.categories",
  "documents-overview": "nav.overview",
  "documents-files": "nav.files",
  "documents-categories": "nav.categories",
  "documents-expiring": "nav.expiring",
  "knowledge-overview": "nav.overview",
  "knowledge-articles": "nav.articles",
  "knowledge-categories": "nav.categories",
  "knowledge-tags": "nav.tags",
  "hr-overview": "nav.overview",
  "hr-employees": "nav.employees",
  "hr-departments": "nav.departments",
  "hr-attendance": "nav.attendance",
  "hr-leave": "nav.leaveRequests",
  "hr-payroll": "nav.payroll",
  "hr-contracts": "nav.contracts",
  "hr-documents": "nav.documents",
  "hr-positions": "nav.positions",
  "my-overview": "nav.myOverview",
  "my-profile": "nav.myProfile",
  "my-attendance": "nav.myAttendance",
  "my-leave": "nav.myLeave",
  "my-payroll": "nav.myPayroll",
  "my-contract": "nav.myContract",
  "my-documents": "nav.myDocuments",
  "my-knowledge": "nav.myKnowledge",
  "my-company-documents": "nav.myCompanyDocuments",
  "my-notifications": "nav.myNotifications",
  "my-settings": "nav.mySettings",
  "reports-overview": "nav.overview",
  "reports-sales": "nav.salesSummary",
  "reports-inventory": "nav.inventoryValuation",
  "reports-procurement": "nav.procurementSummary",
  "reports-financial": "nav.financialSummary",
  "reports-projects": "nav.projectsSummary",
  "reports-support": "nav.supportSummary",
  "reports-documents": "nav.documentsSummary",
  "reports-knowledge": "nav.knowledgeSummary",
  settings: "nav.settings",
  profile: "nav.profile",
};

const NAV_GROUP_KEYS: Record<string, string> = {
  executive: "nav.group.executive",
  accounting: "nav.group.accounting",
  finance: "nav.group.finance",
  inventory: "nav.group.inventory",
  procurement: "nav.group.procurement",
  operations: "nav.group.operations",
  sales: "nav.group.sales",
  crm: "nav.group.crm",
  projects: "nav.group.projects",
  support: "nav.group.support",
  documents: "nav.group.documents",
  knowledge: "nav.group.knowledge",
  hr: "nav.group.hr",
  "my-workspace": "nav.group.myWorkspace",
  reports: "nav.group.reports",
};

export function getNavLabel(
  t: (key: string, fallback?: string) => string,
  itemId: string,
  groupId?: string
): string {
  if (groupId && NAV_GROUP_KEYS[groupId]) return t(NAV_GROUP_KEYS[groupId]);
  return t(NAV_ITEM_KEYS[itemId] ?? itemId, itemId);
}

export function useNavLabel(itemId: string, groupId?: string): string {
  const { t } = useI18n();
  return getNavLabel(t, itemId, groupId);
}

const ROLE_KEYS: Record<string, string> = {
  owner: "nav.role.owner",
  finance_manager: "nav.role.financeManager",
  inventory_manager: "nav.role.inventoryManager",
  sales_manager: "nav.role.salesManager",
  hr_manager: "nav.role.hrManager",
  branch_manager: "nav.role.branchManager",
  employee: "nav.role.employee",
};

export function useRoleLabel(code?: string): string {
  const { t } = useI18n();
  if (!code) return t("nav.role.default");
  return t(ROLE_KEYS[code] ?? "nav.role.default");
}

/** Business-friendly permission label — never shows raw keys to users. */
export function usePermissionLabel(key: string): string {
  const { t } = useI18n();
  const direct = t(`permissions.${key}`);
  if (direct !== `permissions.${key}`) return direct;

  const [section, action] = key.split(".");
  if (!section || !action) return key;

  const sectionLabel = t(`permissions.section.${section}`, section);
  const actionLabel = t(`permissions.action.${action}`, action);
  return `${actionLabel} ${sectionLabel}`;
}

export function useSectionLabel(section: string): string {
  const { t } = useI18n();
  return t(`permissions.section.${section}`, section);
}
