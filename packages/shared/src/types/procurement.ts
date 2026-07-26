import type { MasterDataLifecycle } from "./master-data";

export type PurchaseOrderStatus =
  | "DRAFT"
  | "SENT"
  | "APPROVED"
  | "PARTIALLY_RECEIVED"
  | "RECEIVED"
  | "CANCELLED";

export interface ProcurementVendor {
  id: string;
  code: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  city: string;
  paymentTerms: string;
  notes: string | null;
  isActive: boolean;
  archivedAt: string | null;
  restoredAt: string | null;
  createdAt: string;
  updatedAt: string;
  openPurchaseOrders?: number;
  totalSpend?: string;
}

export interface ProcurementVendorDetail extends ProcurementVendor, MasterDataLifecycle {
  recentPurchaseOrders: ProcurementPurchaseOrder[];
}

export interface UpdateVendorInput {
  name?: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string;
  paymentTerms?: string;
  notes?: string | null;
}

export interface CreateVendorInput {
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  city: string;
  paymentTerms: string;
  notes?: string | null;
  code?: string;
}

export interface ProcurementPurchaseOrderLine {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  category: string;
  unit: string;
  quantity: number;
  unitCost: string;
  lineTotal: string;
}

export interface ProcurementPurchaseOrder {
  id: string;
  poNumber: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDate: string | null;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  notes: string | null;
  vendor: { id: string; code: string; name: string };
  warehouse: { id: string; code: string; name: string; city: string };
  createdBy: { id: string; name: string } | null;
  lineCount?: number;
}

export interface ProcurementPurchaseOrderDetail extends ProcurementPurchaseOrder {
  lines: ProcurementPurchaseOrderLine[];
}

export interface ProcurementOverview {
  totalVendors: number;
  activeVendors: number;
  openPurchaseOrders: number;
  pendingApprovals: number;
  expectedReceipts: number;
  monthlyProcurementSpend: string;
  topVendors: Array<{
    id: string;
    code: string;
    name: string;
    totalSpend: string;
    openOrders: number;
  }>;
  recentPurchaseOrders: ProcurementPurchaseOrder[];
  purchaseOrdersByStatus: Array<{ status: PurchaseOrderStatus; count: number }>;
  expectedReceiptList: Array<{
    id: string;
    poNumber: string;
    vendorName: string;
    expectedDate: string;
    totalAmount: string;
    status: PurchaseOrderStatus;
  }>;
}

export const PROCUREMENT_PERMISSIONS = {
  READ: "procurement.read",
  WRITE: "procurement.write",
} as const;
