import type { Prisma } from "@prisma/client";
import type {
  CustomerType,
  SalesCustomer,
  SalesOrder,
  SalesOrderDetail,
  SalesOrderLine,
  SalesOrderStatus,
} from "@ierp/shared";

type CustomerRecord = Prisma.CustomerGetPayload<object>;

type SalesOrderWithRelations = Prisma.SalesOrderGetPayload<{
  include: {
    customer: true;
    warehouse: true;
    createdBy: true;
    lines: { include: { product: true } };
  };
}>;

type SalesOrderSummary = Prisma.SalesOrderGetPayload<{
  include: {
    customer: true;
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

export function serializeCustomer(
  customer: CustomerRecord,
  openSalesOrders = 0
): SalesCustomer {
  return {
    id: customer.id,
    code: customer.code,
    name: customer.name,
    contactName: customer.contactName,
    email: customer.email,
    phone: customer.phone,
    city: customer.city,
    customerType: customer.customerType as CustomerType,
    paymentTerms: customer.paymentTerms,
    creditLimit: formatMoney(customer.creditLimit),
    notes: customer.notes ?? null,
    isActive: customer.isActive,
    archivedAt: customer.archivedAt?.toISOString() ?? null,
    restoredAt: customer.restoredAt?.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
    openSalesOrders,
  };
}

function serializeLine(line: SalesOrderWithRelations["lines"][number]): SalesOrderLine {
  return {
    id: line.id,
    productId: line.productId,
    sku: line.product.sku,
    productName: line.product.name,
    category: line.product.category,
    unit: line.product.unit,
    quantity: line.quantity,
    unitPrice: formatMoney(line.unitPrice),
    lineTotal: formatMoney(line.lineTotal),
  };
}

export function serializeSalesOrder(so: SalesOrderSummary): SalesOrder {
  return {
    id: so.id,
    soNumber: so.soNumber,
    status: so.status as SalesOrderStatus,
    orderDate: formatDate(so.orderDate),
    expectedDeliveryDate: so.expectedDeliveryDate
      ? formatDate(so.expectedDeliveryDate)
      : null,
    subtotal: formatMoney(so.subtotal),
    taxAmount: formatMoney(so.taxAmount),
    totalAmount: formatMoney(so.totalAmount),
    notes: so.notes,
    customer: {
      id: so.customer.id,
      code: so.customer.code,
      name: so.customer.name,
      city: so.customer.city,
    },
    warehouse: {
      id: so.warehouse.id,
      code: so.warehouse.code,
      name: so.warehouse.name,
      city: so.warehouse.city,
    },
    createdBy: so.createdBy ? { id: so.createdBy.id, name: so.createdBy.name } : null,
    lineCount: so._count?.lines,
  };
}

export function serializeSalesOrderDetail(so: SalesOrderWithRelations): SalesOrderDetail {
  return {
    ...serializeSalesOrder({
      ...so,
      _count: { lines: so.lines.length },
    }),
    lines: so.lines.map(serializeLine),
  };
}

export const OPEN_SO_STATUSES: SalesOrderStatus[] = [
  "CONFIRMED",
  "PICKING",
  "READY_TO_SHIP",
];

/** Alias — open fulfillment orders (excludes DRAFT / terminal). */
export const PENDING_SHIPMENT_STATUSES: SalesOrderStatus[] = [...OPEN_SO_STATUSES];

export const COMPLETED_SO_STATUSES: SalesOrderStatus[] = ["DELIVERED", "INVOICED"];
