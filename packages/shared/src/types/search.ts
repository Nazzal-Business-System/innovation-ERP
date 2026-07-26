export type SearchResultKind = "navigation" | "record";

export type SearchResultType =
  | "nav_item"
  | "product"
  | "warehouse"
  | "customer"
  | "vendor"
  | "sales_order"
  | "purchase_order"
  | "delivery"
  | "goods_receipt"
  | "transfer"
  | "customer_invoice"
  | "vendor_bill"
  | "customer_payment"
  | "vendor_payment"
  | "employee"
  | "department"
  | "position"
  | "leave_request"
  | "payroll_run"
  | "account"
  | "journal_entry"
  | "project"
  | "project_task"
  | "support_ticket"
  | "document"
  | "knowledge_article"
  | "lead"
  | "opportunity"
  | "activity";

export type SearchResultModule =
  | "NAVIGATION"
  | "INVENTORY"
  | "OPERATIONS"
  | "PROCUREMENT"
  | "SALES"
  | "FINANCE"
  | "ACCOUNTING"
  | "HR"
  | "PROJECTS"
  | "SUPPORT"
  | "DOCUMENTS"
  | "KNOWLEDGE"
  | "CRM"
  | "REPORTS";

/** Compact filter chips in the search palette. */
export type SearchScopeFilter = "all" | "navigation" | "records" | "documents" | "people";

export interface GlobalSearchResult {
  id: string;
  kind: SearchResultKind;
  entityType: SearchResultType;
  /** @deprecated Prefer entityType — kept for older callers. */
  type: SearchResultType;
  module: SearchResultModule;
  title: string;
  subtitle: string;
  code?: string | null;
  status?: string | null;
  route: string;
  score: number;
  matchedField?: string;
  matchedSnippet?: string;
  iconKey?: string;
  metadata?: Record<string, string>;
}

export interface GlobalSearchGroup {
  module: SearchResultModule;
  label: string;
  results: GlobalSearchResult[];
  totalInGroup: number;
}

export interface GlobalSearchResponse {
  query: string;
  results: GlobalSearchResult[];
  grouped: GlobalSearchGroup[];
  truncated?: boolean;
}

export const SEARCH_MODULE_LABELS: Record<SearchResultModule, string> = {
  NAVIGATION: "Navigation",
  INVENTORY: "Inventory",
  OPERATIONS: "Operations",
  PROCUREMENT: "Procurement",
  SALES: "Sales",
  FINANCE: "Finance",
  ACCOUNTING: "Accounting",
  HR: "HR",
  PROJECTS: "Projects",
  SUPPORT: "Support",
  DOCUMENTS: "Documents",
  KNOWLEDGE: "Knowledge",
  CRM: "CRM",
  REPORTS: "Reports",
};

export const SEARCH_MODULE_ORDER: SearchResultModule[] = [
  "NAVIGATION",
  "SALES",
  "PROCUREMENT",
  "INVENTORY",
  "OPERATIONS",
  "FINANCE",
  "ACCOUNTING",
  "HR",
  "CRM",
  "PROJECTS",
  "SUPPORT",
  "DOCUMENTS",
  "KNOWLEDGE",
  "REPORTS",
];
