"use client";

import { QueryClient } from "@tanstack/react-query";

/** Shared staleTime policy (ms). */
export const STALE = {
  session: 5 * 60_000,
  permissions: 5 * 60_000,
  reference: 3 * 60_000,
  operational: 45_000,
  dashboard: 30_000,
} as const;

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: STALE.operational,
        gcTime: 15 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: 1,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

export const queryKeys = {
  session: ["session", "me"] as const,
  executiveDashboard: ["dashboard", "executive"] as const,
  inventory: {
    overview: ["inventory", "overview"] as const,
    products: (params: Record<string, unknown>) => ["inventory", "products", params] as const,
    product: (id: string) => ["inventory", "product", id] as const,
    warehouses: ["inventory", "warehouses"] as const,
    warehouse: (id: string) => ["inventory", "warehouse", id] as const,
    transfers: ["inventory", "transfers"] as const,
    transfer: (id: string) => ["inventory", "transfer", id] as const,
  },
  sales: {
    overview: ["sales", "overview"] as const,
    customers: ["sales-2"] as const,
    customer: (id: string) => ["sales-3", id] as const,
    /** Prefix matching existing list keys: ["sales-4", search, status, page] */
    orders: ["sales-4"] as const,
    order: (id: string) => ["sales", "order", id] as const,
  },
  procurement: {
    overview: ["procurement", "overview"] as const,
    vendors: ["procurement-2"] as const,
    vendor: (id: string) => ["procurement-3", id] as const,
    /** Prefix matching existing list keys: ["procurement-4", search, status, page] */
    purchaseOrders: ["procurement-4"] as const,
    purchaseOrder: (id: string) => ["procurement-5", id] as const,
  },
  crm: {
    overview: ["crm-1"] as const,
    leads: ["crm-2"] as const,
    lead: (id: string) => ["crm-3", id] as const,
    opportunities: ["crm-4"] as const,
    opportunity: (id: string) => ["crm-5", id] as const,
    activities: ["crm-6"] as const,
    activity: (id: string) => ["crm-7", id] as const,
    assignees: (search?: string) => ["crm-8", search] as const,
  },
  documents: {
    overview: ["documents-1"] as const,
    files: ["documents-2"] as const,
    file: (id: string) => ["documents-3", id] as const,
    categories: ["documents-4"] as const,
    category: (id: string) => ["documents-category", id] as const,
    links: ["documents-5"] as const,
  },
  knowledge: {
    overview: ["knowledge-1"] as const,
    articles: ["knowledge-2"] as const,
    article: (id: string) => ["knowledge-3", id] as const,
    categories: ["knowledge-4"] as const,
    category: (id: string) => ["knowledge-category", id] as const,
  },
  notifications: {
    overview: ["notifications-1"] as const,
    list: ["notifications-2"] as const,
  },
  operations: {
    overview: ["operations-1"] as const,
    goodsReceipts: ["operations-2"] as const,
    goodsReceipt: (id: string) => ["operations-3", id] as const,
    deliveries: ["operations-4"] as const,
    delivery: (id: string) => ["operations-5", id] as const,
  },
  finance: {
    overview: ["finance-1"] as const,
    customerInvoices: ["finance-2"] as const,
    customerInvoice: (id: string) => ["finance-3", id] as const,
    customerPayments: ["finance-4"] as const,
    customerPayment: (id: string) => ["finance-payment", id] as const,
    vendorBills: ["finance-5"] as const,
    vendorBill: (id: string) => ["finance-6", id] as const,
    vendorPayments: ["finance-7"] as const,
    vendorPayment: (id: string) => ["finance-vendor-payment", id] as const,
    arAging: ["finance-8"] as const,
    apAging: ["finance-9"] as const,
  },
  hr: {
    overview: ["hr-1"] as const,
    employees: ["hr-2"] as const,
    employee: (id: string) => ["hr-3", id] as const,
    departments: ["hr-4"] as const,
    attendance: ["hr-5"] as const,
    leaveRequests: ["hr-6"] as const,
    leaveRequest: (id: string) => ["hr-7", id] as const,
    payrollRuns: ["hr-8"] as const,
    payrollRun: (id: string) => ["hr-9", id] as const,
    contracts: ["hr-10"] as const,
    contract: (id: string) => ["hr-11", id] as const,
    documents: ["hr-12"] as const,
    document: (id: string) => ["hr-13", id] as const,
    positions: ["hr-14"] as const,
    position: (id: string) => ["hr-15", id] as const,
  },
  accounting: {
    accounts: ["accounting-2"] as const,
    account: (id: string) => ["accounting-3", id] as const,
    journalEntries: ["accounting-4"] as const,
    journalEntry: (id: string) => ["accounting-5", id] as const,
  },
  support: {
    overview: ["support-1"] as const,
    tickets: ["support-2"] as const,
    ticket: (id: string) => ["support-3", id] as const,
    categories: ["support-4"] as const,
    category: (id: string) => ["support-category", id] as const,
  },
  projects: {
    overview: ["projects-1"] as const,
    list: ["projects-2"] as const,
    detail: (id: string) => ["projects-3", id] as const,
    tasks: ["projects-4"] as const,
    task: (id: string) => ["projects-5", id] as const,
    milestones: ["projects-6"] as const,
  },
  settings: {
    roles: ["settings-5"] as const,
  },
};
