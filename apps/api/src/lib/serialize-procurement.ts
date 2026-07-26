import type { Prisma } from "@prisma/client";
import type {
  ProcurementPurchaseOrder,
  ProcurementPurchaseOrderDetail,
  ProcurementPurchaseOrderLine,
  ProcurementVendor,
  PurchaseOrderStatus,
} from "@ierp/shared";

type VendorRecord = Prisma.VendorGetPayload<object>;

type PurchaseOrderWithRelations = Prisma.PurchaseOrderGetPayload<{
  include: {
    vendor: true;
    warehouse: true;
    createdBy: true;
    lines: { include: { product: true } };
  };
}>;

type PurchaseOrderSummary = Prisma.PurchaseOrderGetPayload<{
  include: {
    vendor: true;
    warehouse: true;
    createdBy: true;
    _count: { select: { lines: true } };
  };
}>;

export function formatMoney(value: Prisma.Decimal | number): string {
  const num = typeof value === "number" ? value : Number(value);
  return `JOD ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function serializeVendor(vendor: VendorRecord, openPurchaseOrders = 0): ProcurementVendor {
  return {
    id: vendor.id,
    code: vendor.code,
    name: vendor.name,
    contactName: vendor.contactName,
    email: vendor.email,
    phone: vendor.phone,
    city: vendor.city,
    paymentTerms: vendor.paymentTerms,
    notes: vendor.notes ?? null,
    isActive: vendor.isActive,
    archivedAt: vendor.archivedAt?.toISOString() ?? null,
    restoredAt: vendor.restoredAt?.toISOString() ?? null,
    createdAt: vendor.createdAt.toISOString(),
    updatedAt: vendor.updatedAt.toISOString(),
    openPurchaseOrders,
  };
}

function serializeLine(
  line: PurchaseOrderWithRelations["lines"][number]
): ProcurementPurchaseOrderLine {
  return {
    id: line.id,
    productId: line.productId,
    sku: line.product.sku,
    productName: line.product.name,
    category: line.product.category,
    unit: line.product.unit,
    quantity: line.quantity,
    unitCost: formatMoney(line.unitCost),
    lineTotal: formatMoney(line.lineTotal),
  };
}

export function serializePurchaseOrder(po: PurchaseOrderSummary): ProcurementPurchaseOrder {
  return {
    id: po.id,
    poNumber: po.poNumber,
    status: po.status as PurchaseOrderStatus,
    orderDate: formatDate(po.orderDate),
    expectedDate: po.expectedDate ? formatDate(po.expectedDate) : null,
    subtotal: formatMoney(po.subtotal),
    taxAmount: formatMoney(po.taxAmount),
    totalAmount: formatMoney(po.totalAmount),
    notes: po.notes,
    vendor: { id: po.vendor.id, code: po.vendor.code, name: po.vendor.name },
    warehouse: {
      id: po.warehouse.id,
      code: po.warehouse.code,
      name: po.warehouse.name,
      city: po.warehouse.city,
    },
    createdBy: po.createdBy ? { id: po.createdBy.id, name: po.createdBy.name } : null,
    lineCount: po._count?.lines,
  };
}

export function serializePurchaseOrderDetail(
  po: PurchaseOrderWithRelations
): ProcurementPurchaseOrderDetail {
  return {
    ...serializePurchaseOrder({
      ...po,
      _count: { lines: po.lines.length },
    }),
    lines: po.lines.map(serializeLine),
  };
}

export const OPEN_PO_STATUSES: PurchaseOrderStatus[] = [
  "SENT",
  "APPROVED",
  "PARTIALLY_RECEIVED",
];

export const PENDING_APPROVAL_STATUSES: PurchaseOrderStatus[] = ["SENT"];

export const EXPECTED_RECEIPT_STATUSES: PurchaseOrderStatus[] = [
  "APPROVED",
  "PARTIALLY_RECEIVED",
];
