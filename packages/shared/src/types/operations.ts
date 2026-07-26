export type GoodsReceiptStatus = "DRAFT" | "RECEIVED" | "CANCELLED";

export type DeliveryStatus = "DRAFT" | "PICKED" | "DELIVERED" | "CANCELLED";

export interface OperationsGoodsReceiptLine {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  orderedQuantity: number;
  receivedQuantity: number;
  rejectedQuantity: number;
  notes: string | null;
}

export interface OperationsGoodsReceipt {
  id: string;
  receiptNumber: string;
  status: GoodsReceiptStatus;
  receivedDate: string | null;
  notes: string | null;
  purchaseOrder: { id: string; poNumber: string; status: string };
  warehouse: { id: string; code: string; name: string; city: string };
  receivedBy: { id: string; name: string } | null;
  lineCount?: number;
}

export interface OperationsGoodsReceiptDetail extends OperationsGoodsReceipt {
  lines: OperationsGoodsReceiptLine[];
  stockImpact: Array<{
    productId: string;
    sku: string;
    productName: string;
    quantity: number;
    movementType: string | null;
  }>;
  canReceive: boolean;
}

export interface OperationsDeliveryLine {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  orderedQuantity: number;
  deliveredQuantity: number;
  returnedQuantity: number;
  notes: string | null;
  availableStock?: number;
}

export interface OperationsDelivery {
  id: string;
  deliveryNumber: string;
  status: DeliveryStatus;
  deliveryDate: string | null;
  notes: string | null;
  salesOrder: { id: string; soNumber: string; status: string };
  customer: { id: string; code: string; name: string };
  warehouse: { id: string; code: string; name: string; city: string };
  deliveredBy: { id: string; name: string } | null;
  lineCount?: number;
}

export interface OperationsDeliveryDetail extends OperationsDelivery {
  lines: OperationsDeliveryLine[];
  stockImpact: Array<{
    productId: string;
    sku: string;
    productName: string;
    quantity: number;
    movementType: string | null;
  }>;
  canDeliver: boolean;
  stockWarnings: string[];
}

export interface OperationsOverview {
  pendingReceipts: number;
  completedReceipts: number;
  pendingDeliveries: number;
  completedDeliveries: number;
  stockImpactsThisMonth: number;
  recentGoodsReceipts: OperationsGoodsReceipt[];
  recentDeliveries: OperationsDelivery[];
  workflowAlerts: Array<{
    id: string;
    type: "warning" | "info" | "error";
    title: string;
    message: string;
    href: string | null;
  }>;
}

export const OPERATIONS_PERMISSIONS = {
  READ: "operations.read",
  WRITE: "operations.write",
} as const;
