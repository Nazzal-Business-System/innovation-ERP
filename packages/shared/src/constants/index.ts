export const APP_NAME = "Innovation ERP";

export const API_SERVICE_NAME = "innovation-erp-api";
export const WEB_SERVICE_NAME = "innovation-erp-web";

export const DEFAULT_API_PORT = 4010;
export const DEFAULT_WEB_PORT = 3010;

export const API_VERSION = "0.0.1";

export const DEMO_PASSWORD = "demo123";

export const DEMO_CREDENTIALS = [
  { role: "CEO", email: "ceo@nazzal.demo", password: DEMO_PASSWORD },
  { role: "Finance Manager", email: "finance@nazzal.demo", password: DEMO_PASSWORD },
  { role: "Inventory Manager", email: "inventory@nazzal.demo", password: DEMO_PASSWORD },
  { role: "Sales Manager", email: "sales@nazzal.demo", password: DEMO_PASSWORD },
  { role: "HR Manager", email: "hr@nazzal.demo", password: DEMO_PASSWORD },
  { role: "Branch Manager", email: "branch@nazzal.demo", password: DEMO_PASSWORD },
] as const;

export const DEMO_ORGANIZATION_NAME = "Al-Noor Trading Company";

/** Public demo employee login accounts (no passwords — use DEMO_PASSWORD server-side). */
export interface DemoEmployeeLoginOption {
  userId: string;
  email: string;
  employeeId: string;
  employeeNumber: string;
  fullName: string;
  department: string;
  position: string;
  workLocation: string;
  hasAvatar: boolean;
}

export const AUTH_TOKEN_KEY = "ierp_auth_token";

/** Navigation groups — placeholder until module pages exist */
export const NAV_GROUPS = [
  {
    id: "executive",
    labelKey: "Executive",
    items: [
      { id: "dashboard", labelKey: "Dashboard", href: "/dashboard" },
      { id: "notifications", labelKey: "Notifications", href: "/dashboard/notifications" },
    ],
  },
  {
    id: "accounting",
    labelKey: "Accounting",
    items: [
      { id: "accounting-overview", labelKey: "Overview", href: "/dashboard/accounting" },
      {
        id: "accounting-chart",
        labelKey: "Chart of Accounts",
        href: "/dashboard/accounting/chart-of-accounts",
      },
      {
        id: "accounting-journal",
        labelKey: "Journal Entries",
        href: "/dashboard/accounting/journal-entries",
      },
      {
        id: "accounting-trial-balance",
        labelKey: "Trial Balance",
        href: "/dashboard/accounting/trial-balance",
      },
    ],
  },
  {
    id: "finance",
    labelKey: "Finance",
    items: [
      { id: "finance-overview", labelKey: "Overview", href: "/dashboard/finance" },
      { id: "finance-customer-invoices", labelKey: "Customer Invoices", href: "/dashboard/finance/customer-invoices" },
      { id: "finance-customer-payments", labelKey: "Customer Payments", href: "/dashboard/finance/customer-payments" },
      { id: "finance-vendor-bills", labelKey: "Vendor Bills", href: "/dashboard/finance/vendor-bills" },
      { id: "finance-vendor-payments", labelKey: "Vendor Payments", href: "/dashboard/finance/vendor-payments" },
      { id: "finance-ar-aging", labelKey: "AR Aging", href: "/dashboard/finance/ar-aging" },
      { id: "finance-ap-aging", labelKey: "AP Aging", href: "/dashboard/finance/ap-aging" },
    ],
  },
  {
    id: "operations",
    labelKey: "Operations",
    items: [
      { id: "operations-overview", labelKey: "Overview", href: "/dashboard/operations" },
      {
        id: "operations-goods-receipts",
        labelKey: "Goods Receipts",
        href: "/dashboard/operations/goods-receipts",
      },
      {
        id: "operations-deliveries",
        labelKey: "Deliveries",
        href: "/dashboard/operations/deliveries",
      },
    ],
  },
  {
    id: "inventory",
    labelKey: "Inventory",
    items: [
      { id: "inventory-overview", labelKey: "Overview", href: "/dashboard/inventory" },
      { id: "inventory-products", labelKey: "Products", href: "/dashboard/inventory/products" },
      { id: "inventory-warehouses", labelKey: "Warehouses", href: "/dashboard/inventory/warehouses" },
      { id: "inventory-movements", labelKey: "Movements", href: "/dashboard/inventory/movements" },
      { id: "inventory-reservations", labelKey: "Reservations", href: "/dashboard/inventory/reservations" },
      { id: "inventory-transfers", labelKey: "Transfers", href: "/dashboard/inventory/transfers" },
    ],
  },
  {
    id: "procurement",
    labelKey: "Procurement",
    items: [
      { id: "procurement-overview", labelKey: "Overview", href: "/dashboard/procurement" },
      { id: "procurement-vendors", labelKey: "Vendors", href: "/dashboard/procurement/vendors" },
      {
        id: "procurement-purchase-orders",
        labelKey: "Purchase Orders",
        href: "/dashboard/procurement/purchase-orders",
      },
    ],
  },
  {
    id: "sales",
    labelKey: "Sales",
    items: [
      { id: "sales-overview", labelKey: "Overview", href: "/dashboard/sales" },
      { id: "sales-customers", labelKey: "Customers", href: "/dashboard/sales/customers" },
      { id: "sales-orders", labelKey: "Sales Orders", href: "/dashboard/sales/orders" },
    ],
  },
  {
    id: "crm",
    labelKey: "CRM",
    items: [
      { id: "crm-overview", labelKey: "Overview", href: "/dashboard/crm" },
      { id: "crm-leads", labelKey: "Leads", href: "/dashboard/crm/leads" },
      { id: "crm-opportunities", labelKey: "Opportunities", href: "/dashboard/crm/opportunities" },
      { id: "crm-activities", labelKey: "Activities", href: "/dashboard/crm/activities" },
    ],
  },
  {
    id: "projects",
    labelKey: "Projects",
    items: [
      { id: "projects-overview", labelKey: "Overview", href: "/dashboard/projects" },
      { id: "projects-tasks", labelKey: "Tasks", href: "/dashboard/projects/tasks" },
      { id: "projects-milestones", labelKey: "Milestones", href: "/dashboard/projects/milestones" },
    ],
  },
  {
    id: "support",
    labelKey: "Support",
    items: [
      { id: "support-overview", labelKey: "Overview", href: "/dashboard/support" },
      { id: "support-tickets", labelKey: "Tickets", href: "/dashboard/support/tickets" },
      { id: "support-categories", labelKey: "Categories", href: "/dashboard/support/categories" },
    ],
  },
  {
    id: "documents",
    labelKey: "Documents",
    items: [
      { id: "documents-overview", labelKey: "Overview", href: "/dashboard/documents" },
      { id: "documents-files", labelKey: "Files", href: "/dashboard/documents/files" },
      { id: "documents-categories", labelKey: "Categories", href: "/dashboard/documents/categories" },
      { id: "documents-expiring", labelKey: "Expiring", href: "/dashboard/documents/expiring" },
    ],
  },
  {
    id: "knowledge",
    labelKey: "Knowledge",
    items: [
      { id: "knowledge-overview", labelKey: "Overview", href: "/dashboard/knowledge" },
      { id: "knowledge-articles", labelKey: "Articles", href: "/dashboard/knowledge/articles" },
      { id: "knowledge-categories", labelKey: "Categories", href: "/dashboard/knowledge/categories" },
      { id: "knowledge-tags", labelKey: "Tags", href: "/dashboard/knowledge/tags" },
    ],
  },
  {
    id: "my-workspace",
    labelKey: "My Workspace",
    items: [
      { id: "my-overview", labelKey: "My Overview", href: "/dashboard/my-workspace" },
      { id: "my-profile", labelKey: "My Profile", href: "/dashboard/my-workspace/profile" },
      { id: "my-attendance", labelKey: "Attendance", href: "/dashboard/my-workspace/attendance" },
      { id: "my-leave", labelKey: "Leave Requests", href: "/dashboard/my-workspace/leave" },
      { id: "my-payroll", labelKey: "Payroll", href: "/dashboard/my-workspace/payroll" },
      { id: "my-contract", labelKey: "Contract", href: "/dashboard/my-workspace/contract" },
      { id: "my-documents", labelKey: "My Documents", href: "/dashboard/my-workspace/documents" },
      { id: "my-knowledge", labelKey: "Knowledge Base", href: "/dashboard/my-workspace/knowledge" },
      {
        id: "my-company-documents",
        labelKey: "Company Documents",
        href: "/dashboard/my-workspace/company-documents",
      },
      {
        id: "my-notifications",
        labelKey: "Notifications",
        href: "/dashboard/my-workspace/notifications",
      },
    ],
  },
  {
    id: "hr",
    labelKey: "HR",
    items: [
      { id: "hr-overview", labelKey: "Overview", href: "/dashboard/hr" },
      { id: "hr-employees", labelKey: "Employees", href: "/dashboard/hr/employees" },
      { id: "hr-departments", labelKey: "Departments", href: "/dashboard/hr/departments" },
      { id: "hr-attendance", labelKey: "Attendance", href: "/dashboard/hr/attendance" },
      { id: "hr-leave", labelKey: "Leave Requests", href: "/dashboard/hr/leave-requests" },
      { id: "hr-payroll", labelKey: "Payroll", href: "/dashboard/hr/payroll" },
      { id: "hr-contracts", labelKey: "Contracts", href: "/dashboard/hr/contracts" },
      { id: "hr-documents", labelKey: "Documents", href: "/dashboard/hr/documents" },
      { id: "hr-positions", labelKey: "Positions", href: "/dashboard/hr/positions" },
    ],
  },
  {
    id: "reports",
    labelKey: "Reports",
    items: [
      { id: "reports-overview", labelKey: "Overview", href: "/dashboard/reports" },
      { id: "reports-sales", labelKey: "Sales Summary", href: "/dashboard/reports/sales-summary" },
      {
        id: "reports-inventory",
        labelKey: "Inventory Valuation",
        href: "/dashboard/reports/inventory-valuation",
      },
      {
        id: "reports-procurement",
        labelKey: "Procurement Summary",
        href: "/dashboard/reports/procurement-summary",
      },
      {
        id: "reports-financial",
        labelKey: "Financial Summary",
        href: "/dashboard/reports/financial-summary",
      },
      {
        id: "reports-projects",
        labelKey: "Projects Summary",
        href: "/dashboard/reports/projects-summary",
      },
      {
        id: "reports-support",
        labelKey: "Support Summary",
        href: "/dashboard/reports/support-summary",
      },
      {
        id: "reports-documents",
        labelKey: "Documents Summary",
        href: "/dashboard/reports/documents-summary",
      },
      {
        id: "reports-knowledge",
        labelKey: "Knowledge Summary",
        href: "/dashboard/reports/knowledge-summary",
      },
    ],
  },
] as const;

/** Flat list of pinnable / matchable sidebar leaf item IDs from NAV_GROUPS. */
export const NAV_ITEM_IDS = NAV_GROUPS.flatMap((group) => group.items.map((item) => item.id));

export type NavItemId = (typeof NAV_GROUPS)[number]["items"][number]["id"];

const NAV_ITEM_BY_ID = new Map(
  NAV_GROUPS.flatMap((group) => group.items.map((item) => [item.id, item] as const))
);

export function getNavItemById(id: string): { id: string; labelKey: string; href: string } | undefined {
  return NAV_ITEM_BY_ID.get(id as NavItemId);
}

export function isKnownNavItemId(id: string): boolean {
  return NAV_ITEM_BY_ID.has(id as NavItemId);
}

/** Stable module/group IDs from NAV_GROUPS (used for collapsible sidebar state). */
export const NAV_GROUP_IDS = NAV_GROUPS.map((group) => group.id);

export type NavGroupId = (typeof NAV_GROUPS)[number]["id"];

const NAV_GROUP_ID_SET = new Set<string>(NAV_GROUP_IDS);

export function isKnownNavGroupId(id: string): boolean {
  return NAV_GROUP_ID_SET.has(id);
}

/** The group ID that owns a given leaf nav item ID, if any. */
export function getNavGroupIdForItem(itemId: string): string | undefined {
  for (const group of NAV_GROUPS) {
    if (group.items.some((item) => item.id === itemId)) return group.id;
  }
  return undefined;
}

/** NBS enterprise palette — indigo / violet */
export const theme = {
  colors: {
    navy950: "#030712",
    navy900: "#050a14",
    navy800: "#0c1222",
    indigo400: "#818cf8",
    indigo500: "#6366f1",
    violet500: "#8b5cf6",
    cyan400: "#22d3ee",
  },
} as const;

export const DEMO_NOTICE =
  "Demo environment — Al-Noor Trading Company. Data is for demonstration only.";
