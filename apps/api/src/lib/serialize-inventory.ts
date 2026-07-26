import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma.js";
import type {
  InventoryMovement,
  InventoryProduct,
  InventoryProductDetail,
  InventoryReservation,
  InventoryTransfer,
  InventoryWarehouse,
  ProductStatus,
  ReservationStatus,
  StockMovementType,
  TransferStatus,
} from "@ierp/shared";

type ProductWithBalances = Prisma.ProductGetPayload<{
  include: {
    stockBalances: true;
  };
}>;

type ProductWithWarehouseBalances = Prisma.ProductGetPayload<{
  include: {
    stockBalances: { include: { warehouse: true } };
  };
}>;

type MovementWithRelations = Prisma.StockMovementGetPayload<{
  include: {
    product: true;
    warehouse: true;
    toWarehouse: true;
    createdBy: true;
  };
}>;

type WarehouseWithBalances = Prisma.WarehouseGetPayload<{
  include: {
    stockBalances: { include: { product: true } };
  };
}>;

function formatMoney(value: Prisma.Decimal | number): string {
  const num = typeof value === "number" ? value : Number(value);
  return `JOD ${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function sumProductStock(product: ProductWithBalances) {
  let totalOnHand = 0;
  let totalReserved = 0;
  let totalValue = 0;

  for (const balance of product.stockBalances) {
    totalOnHand += balance.quantityOnHand;
    totalReserved += balance.quantityReserved;
    totalValue += balance.quantityOnHand * Number(product.costPrice);
  }

  return { totalOnHand, totalReserved, totalValue };
}

export function serializeProduct(product: ProductWithBalances): InventoryProduct {
  const { totalOnHand, totalReserved, totalValue } = sumProductStock(product);
  const isLowStock = totalOnHand <= product.reorderLevel && product.status === "ACTIVE";

  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    description: product.description,
    category: product.category,
    unit: product.unit,
    costPrice: formatMoney(product.costPrice),
    sellPrice: formatMoney(product.sellPrice),
    reorderLevel: product.reorderLevel,
    status: product.status as ProductStatus,
    isArchived: product.isArchived,
    archivedAt: product.archivedAt?.toISOString() ?? null,
    restoredAt: product.restoredAt?.toISOString() ?? null,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    totalOnHand,
    totalReserved,
    totalValue: formatMoney(totalValue),
    isLowStock,
  };
}

export function serializeProductDetail(
  product: ProductWithWarehouseBalances,
  recentMovements: MovementWithRelations[]
): Omit<InventoryProductDetail, "audit" | "timeline"> {
  const base = serializeProduct(product);

  return {
    ...base,
    stockByWarehouse: product.stockBalances.map((b) => ({
      warehouseId: b.warehouseId,
      warehouseCode: b.warehouse.code,
      warehouseName: b.warehouse.name,
      quantityOnHand: b.quantityOnHand,
      quantityReserved: b.quantityReserved,
      available: b.quantityOnHand - b.quantityReserved,
    })),
    recentMovements: recentMovements.map(serializeMovement),
  };
}

export function serializeWarehouse(warehouse: WarehouseWithBalances): InventoryWarehouse {
  let totalUnits = 0;
  let totalValue = 0;

  for (const balance of warehouse.stockBalances) {
    totalUnits += balance.quantityOnHand;
    totalValue += balance.quantityOnHand * Number(balance.product.costPrice);
  }

  const productIds = new Set(warehouse.stockBalances.map((b) => b.productId));

  return {
    id: warehouse.id,
    code: warehouse.code,
    name: warehouse.name,
    city: warehouse.city,
    branch: warehouse.branch,
    address: warehouse.address,
    notes: warehouse.notes ?? null,
    isActive: warehouse.isActive,
    deactivatedAt: warehouse.deactivatedAt?.toISOString() ?? null,
    reactivatedAt: warehouse.reactivatedAt?.toISOString() ?? null,
    createdAt: warehouse.createdAt.toISOString(),
    updatedAt: warehouse.updatedAt.toISOString(),
    productCount: productIds.size,
    totalUnits,
    totalValue: formatMoney(totalValue),
  };
}

export function serializeMovement(movement: MovementWithRelations): InventoryMovement {
  return {
    id: movement.id,
    type: movement.type as StockMovementType,
    quantity: movement.quantity,
    reference: movement.reference,
    notes: movement.notes,
    createdAt: movement.createdAt.toISOString(),
    product: {
      id: movement.product.id,
      sku: movement.product.sku,
      name: movement.product.name,
    },
    warehouse: {
      id: movement.warehouse.id,
      code: movement.warehouse.code,
      name: movement.warehouse.name,
    },
    toWarehouse: movement.toWarehouse
      ? {
          id: movement.toWarehouse.id,
          code: movement.toWarehouse.code,
          name: movement.toWarehouse.name,
        }
      : null,
    createdBy: movement.createdBy
      ? { id: movement.createdBy.id, name: movement.createdBy.name }
      : null,
  };
}

export { formatMoney };

type ReservationWithRelations = Prisma.StockReservationGetPayload<{
  include: {
    salesOrder: true;
    warehouse: true;
    lines: { include: { product: true } };
  };
}>;

type TransferWithRelations = Prisma.WarehouseTransferGetPayload<{
  include: {
    sourceWarehouse: true;
    destinationWarehouse: true;
    createdBy: true;
    lines: { include: { product: true } };
  };
}>;

export async function reservationAvailableMap(
  reservation: ReservationWithRelations
): Promise<Map<string, number>> {
  const balances = await prisma.stockBalance.findMany({
    where: {
      warehouseId: reservation.warehouseId,
      productId: { in: reservation.lines.map((l) => l.productId) },
    },
  });
  const map = new Map<string, number>();
  for (const b of balances) {
    map.set(b.productId, b.quantityOnHand - b.quantityReserved);
  }
  return map;
}

export function serializeReservation(
  reservation: ReservationWithRelations,
  availableMap: Map<string, number>
): InventoryReservation {
  let totalReservedQty = 0;
  let totalAvailableQty = 0;

  const lines = reservation.lines.map((line) => {
    totalReservedQty += line.quantity;
    const available = availableMap.get(line.productId) ?? 0;
    totalAvailableQty += available;
    return {
      id: line.id,
      productId: line.productId,
      sku: line.product.sku,
      productName: line.product.name,
      quantity: line.quantity,
      availableAtWarehouse: available,
    };
  });

  return {
    id: reservation.id,
    reservationNumber: reservation.reservationNumber,
    status: reservation.status as ReservationStatus,
    reservedDate: reservation.reservedDate.toISOString().slice(0, 10),
    releasedDate: reservation.releasedDate?.toISOString().slice(0, 10) ?? null,
    notes: reservation.notes,
    totalReservedQty,
    totalAvailableQty,
    salesOrder: {
      id: reservation.salesOrder.id,
      soNumber: reservation.salesOrder.soNumber,
      status: reservation.salesOrder.status,
    },
    warehouse: {
      id: reservation.warehouse.id,
      code: reservation.warehouse.code,
      name: reservation.warehouse.name,
    },
    lines,
  };
}

export function serializeTransfer(transfer: TransferWithRelations): InventoryTransfer {
  return {
    id: transfer.id,
    transferNumber: transfer.transferNumber,
    status: transfer.status as TransferStatus,
    transferDate: transfer.transferDate.toISOString().slice(0, 10),
    completedDate: transfer.completedDate?.toISOString().slice(0, 10) ?? null,
    notes: transfer.notes,
    sourceWarehouse: {
      id: transfer.sourceWarehouse.id,
      code: transfer.sourceWarehouse.code,
      name: transfer.sourceWarehouse.name,
    },
    destinationWarehouse: {
      id: transfer.destinationWarehouse.id,
      code: transfer.destinationWarehouse.code,
      name: transfer.destinationWarehouse.name,
    },
    createdBy: transfer.createdBy
      ? { id: transfer.createdBy.id, name: transfer.createdBy.name }
      : null,
    lines: transfer.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      sku: line.product.sku,
      productName: line.product.name,
      quantity: line.quantity,
    })),
    canComplete: transfer.status === "DRAFT" || transfer.status === "IN_TRANSIT",
  };
}
