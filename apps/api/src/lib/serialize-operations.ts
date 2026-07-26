import type {
  Delivery,
  DeliveryLine,
  GoodsReceipt,
  GoodsReceiptLine,
  Product,
  PurchaseOrder,
  SalesOrder,
  User,
  Warehouse,
  Customer,
} from "@prisma/client";

type GoodsReceiptSummary = GoodsReceipt & {
  purchaseOrder: Pick<PurchaseOrder, "id" | "poNumber" | "status">;
  warehouse: Pick<Warehouse, "id" | "code" | "name" | "city">;
  receivedBy: Pick<User, "id" | "name"> | null;
  _count?: { lines: number };
};

type GoodsReceiptDetail = GoodsReceipt & {
  purchaseOrder: Pick<PurchaseOrder, "id" | "poNumber" | "status">;
  warehouse: Pick<Warehouse, "id" | "code" | "name" | "city">;
  receivedBy: Pick<User, "id" | "name"> | null;
  lines: Array<GoodsReceiptLine & { product: Pick<Product, "id" | "sku" | "name" | "unit"> }>;
};

type DeliverySummary = Delivery & {
  salesOrder: Pick<SalesOrder, "id" | "soNumber" | "status"> & {
    customer: Pick<Customer, "id" | "code" | "name">;
  };
  warehouse: Pick<Warehouse, "id" | "code" | "name" | "city">;
  deliveredBy: Pick<User, "id" | "name"> | null;
  _count?: { lines: number };
};

type DeliveryDetail = Delivery & {
  salesOrder: Pick<SalesOrder, "id" | "soNumber" | "status"> & {
    customer: Pick<Customer, "id" | "code" | "name">;
  };
  warehouse: Pick<Warehouse, "id" | "code" | "name" | "city">;
  deliveredBy: Pick<User, "id" | "name"> | null;
  lines: Array<DeliveryLine & { product: Pick<Product, "id" | "sku" | "name" | "unit"> }>;
};

function formatDate(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString().slice(0, 10);
}

export function serializeGoodsReceipt(receipt: GoodsReceiptSummary) {
  return {
    id: receipt.id,
    receiptNumber: receipt.receiptNumber,
    status: receipt.status,
    receivedDate: formatDate(receipt.receivedDate),
    notes: receipt.notes,
    purchaseOrder: {
      id: receipt.purchaseOrder.id,
      poNumber: receipt.purchaseOrder.poNumber,
      status: receipt.purchaseOrder.status,
    },
    warehouse: {
      id: receipt.warehouse.id,
      code: receipt.warehouse.code,
      name: receipt.warehouse.name,
      city: receipt.warehouse.city,
    },
    receivedBy: receipt.receivedBy
      ? { id: receipt.receivedBy.id, name: receipt.receivedBy.name }
      : null,
    lineCount: receipt._count?.lines,
  };
}

export function serializeGoodsReceiptDetail(
  receipt: GoodsReceiptDetail,
  options?: { canReceive?: boolean; stockImpact?: Array<{ productId: string; sku: string; productName: string; quantity: number; movementType: string | null }> }
) {
  return {
    ...serializeGoodsReceipt(receipt),
    lines: receipt.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      sku: line.product.sku,
      productName: line.product.name,
      unit: line.product.unit,
      orderedQuantity: line.orderedQuantity,
      receivedQuantity: line.receivedQuantity,
      rejectedQuantity: line.rejectedQuantity,
      notes: line.notes,
    })),
    stockImpact: options?.stockImpact ?? receipt.lines
      .filter((l) => l.receivedQuantity > 0)
      .map((l) => ({
        productId: l.productId,
        sku: l.product.sku,
        productName: l.product.name,
        quantity: l.receivedQuantity,
        movementType: receipt.status === "RECEIVED" ? "RECEIPT" : null,
      })),
    canReceive: options?.canReceive ?? receipt.status === "DRAFT",
  };
}

export function serializeDelivery(delivery: DeliverySummary) {
  return {
    id: delivery.id,
    deliveryNumber: delivery.deliveryNumber,
    status: delivery.status,
    deliveryDate: formatDate(delivery.deliveryDate),
    notes: delivery.notes,
    salesOrder: {
      id: delivery.salesOrder.id,
      soNumber: delivery.salesOrder.soNumber,
      status: delivery.salesOrder.status,
    },
    customer: {
      id: delivery.salesOrder.customer.id,
      code: delivery.salesOrder.customer.code,
      name: delivery.salesOrder.customer.name,
    },
    warehouse: {
      id: delivery.warehouse.id,
      code: delivery.warehouse.code,
      name: delivery.warehouse.name,
      city: delivery.warehouse.city,
    },
    deliveredBy: delivery.deliveredBy
      ? { id: delivery.deliveredBy.id, name: delivery.deliveredBy.name }
      : null,
    lineCount: delivery._count?.lines,
  };
}

export function serializeDeliveryDetail(
  delivery: DeliveryDetail,
  options?: {
    canDeliver?: boolean;
    stockWarnings?: string[];
    availableStock?: Map<string, number>;
    stockImpact?: Array<{ productId: string; sku: string; productName: string; quantity: number; movementType: string | null }>;
  }
) {
  return {
    ...serializeDelivery(delivery),
    lines: delivery.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      sku: line.product.sku,
      productName: line.product.name,
      unit: line.product.unit,
      orderedQuantity: line.orderedQuantity,
      deliveredQuantity: line.deliveredQuantity,
      returnedQuantity: line.returnedQuantity,
      notes: line.notes,
      availableStock: options?.availableStock?.get(line.productId),
    })),
    stockImpact: options?.stockImpact ?? delivery.lines
      .filter((l) => l.deliveredQuantity > 0)
      .map((l) => ({
        productId: l.productId,
        sku: l.product.sku,
        productName: l.product.name,
        quantity: l.deliveredQuantity,
        movementType: delivery.status === "DELIVERED" ? "ISSUE" : null,
      })),
    canDeliver:
      options?.canDeliver ??
      (delivery.status === "DRAFT" || delivery.status === "PICKED"),
    stockWarnings: options?.stockWarnings ?? [],
  };
}
