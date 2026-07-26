import type { MasterDataLifecycle } from "./master-data";

export type CustomerType = "RETAILER" | "WHOLESALER" | "CORPORATE" | "DISTRIBUTOR";

export type CustomerSort =
  | "NEWEST"
  | "OLDEST"
  | "NAME_ASC"
  | "NAME_DESC"
  | "CODE_ASC"
  | "CODE_DESC"
  | "CREDIT_DESC"
  | "CREDIT_ASC";

export type SalesOrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PICKING"
  | "READY_TO_SHIP"
  | "DELIVERED"
  | "INVOICED"
  | "CANCELLED";

export interface SalesCustomer {
  id: string;
  code: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string;
  customerType: CustomerType;
  paymentTerms: string;
  creditLimit: string;
  notes: string | null;
  isActive: boolean;
  archivedAt: string | null;
  restoredAt: string | null;
  createdAt: string;
  updatedAt: string;
  openSalesOrders?: number;
  totalSales?: string;
}

export interface SalesCustomerDetail extends SalesCustomer, MasterDataLifecycle {
  recentSalesOrders: SalesOrder[];
}

export interface UpdateCustomerInput {
  name?: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string;
  customerType?: CustomerType;
  paymentTerms?: string;
  creditLimit?: number;
  notes?: string | null;
}

export interface CreateCustomerInput {
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  city: string;
  customerType: CustomerType;
  paymentTerms: string;
  creditLimit: number;
  notes?: string | null;
  /** Optional; server generates CUS-NNN when omitted. */
  code?: string;
}

export interface SalesOrderLine {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  category: string;
  unit: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}

export interface SalesOrder {
  id: string;
  soNumber: string;
  status: SalesOrderStatus;
  orderDate: string;
  expectedDeliveryDate: string | null;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  notes: string | null;
  customer: { id: string; code: string; name: string; city: string };
  warehouse: { id: string; code: string; name: string; city: string };
  createdBy: { id: string; name: string } | null;
  lineCount?: number;
}

export interface SalesOrderDetail extends SalesOrder {
  lines: SalesOrderLine[];
}

export interface SalesOverview {
  totalCustomers: number;
  activeCustomers: number;
  openSalesOrders: number;
  pendingShipments: number;
  monthlySales: string;
  averageOrderValue: string;
  topCustomers: Array<{
    id: string;
    code: string;
    name: string;
    totalSales: string;
    openOrders: number;
  }>;
  recentSalesOrders: SalesOrder[];
  salesOrdersByStatus: Array<{ status: SalesOrderStatus; count: number }>;
  pendingShipmentList: Array<{
    id: string;
    soNumber: string;
    customerName: string;
    expectedDeliveryDate: string;
    totalAmount: string;
    status: SalesOrderStatus;
  }>;
}

export const SALES_PERMISSIONS = {
  READ: "sales.read",
  WRITE: "sales.write",
} as const;
