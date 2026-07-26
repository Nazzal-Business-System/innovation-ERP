import type { MasterDataLifecycle } from "./master-data";

export type ProductStatus = "ACTIVE" | "DISCONTINUED" | "DRAFT";

export type StockMovementType =
  | "RECEIPT"
  | "ISSUE"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "ADJUSTMENT";

export interface InventoryWarehouse {
  id: string;
  code: string;
  name: string;
  city: string;
  branch: string;
  address: string | null;
  notes: string | null;
  isActive: boolean;
  deactivatedAt: string | null;
  reactivatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  productCount?: number;
  totalUnits?: number;
  totalValue?: string;
}

export interface InventoryProduct {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  costPrice: string;
  sellPrice: string;
  reorderLevel: number;
  status: ProductStatus;
  isArchived: boolean;
  archivedAt: string | null;
  restoredAt: string | null;
  createdAt: string;
  updatedAt: string;
  totalOnHand?: number;
  totalReserved?: number;
  totalValue?: string;
  isLowStock?: boolean;
}

export interface InventoryProductDetail extends InventoryProduct, MasterDataLifecycle {
  stockByWarehouse: Array<{
    warehouseId: string;
    warehouseCode: string;
    warehouseName: string;
    quantityOnHand: number;
    quantityReserved: number;
    available: number;
  }>;
  recentMovements: InventoryMovement[];
}

export interface UpdateProductInput {
  name?: string;
  description?: string | null;
  category?: string;
  unit?: string;
  costPrice?: number;
  sellPrice?: number;
  reorderLevel?: number;
  status?: ProductStatus;
}

export interface UpdateWarehouseInput {
  name?: string;
  city?: string;
  branch?: string;
  address?: string | null;
  notes?: string | null;
}

export interface InventoryMovement {
  id: string;
  type: StockMovementType;
  quantity: number;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  product: { id: string; sku: string; name: string };
  warehouse: { id: string; code: string; name: string };
  toWarehouse: { id: string; code: string; name: string } | null;
  createdBy: { id: string; name: string } | null;
}

export interface InventoryOverview {
  totalProducts: number;
  activeProducts: number;
  totalSkus: number;
  totalUnitsOnHand: number;
  totalUnitsReserved: number;
  totalUnitsAvailable: number;
  transfersInTransit: number;
  totalInventoryValue: string;
  lowStockCount: number;
  warehouseCount: number;
  recentMovementCount: number;
  topCategories: Array<{ category: string; productCount: number; totalUnits: number }>;
  warehouseSummary: Array<{
    id: string;
    code: string;
    name: string;
    branch: string;
    totalUnits: number;
    totalValue: string;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export const INVENTORY_PERMISSIONS = {
  READ: "inventory.read",
  WRITE: "inventory.write",
} as const;

export type ReservationStatus = "ACTIVE" | "RELEASED" | "CONSUMED" | "CANCELLED";

export type TransferStatus = "DRAFT" | "IN_TRANSIT" | "COMPLETED" | "CANCELLED";

export interface InventoryReservationLine {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
  availableAtWarehouse: number;
}

export interface InventoryReservation {
  id: string;
  reservationNumber: string;
  status: ReservationStatus;
  reservedDate: string;
  releasedDate: string | null;
  notes: string | null;
  totalReservedQty: number;
  totalAvailableQty: number;
  salesOrder: { id: string; soNumber: string; status: string };
  warehouse: { id: string; code: string; name: string };
  lines: InventoryReservationLine[];
}

export interface InventoryTransferLine {
  id: string;
  productId: string;
  sku: string;
  productName: string;
  quantity: number;
}

export interface InventoryTransfer {
  id: string;
  transferNumber: string;
  status: TransferStatus;
  transferDate: string;
  completedDate: string | null;
  notes: string | null;
  sourceWarehouse: { id: string; code: string; name: string };
  destinationWarehouse: { id: string; code: string; name: string };
  createdBy: { id: string; name: string } | null;
  lines: InventoryTransferLine[];
  canComplete: boolean;
}

export interface CreateTransferInput {
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  transferDate?: string;
  notes?: string;
  lines: Array<{ productId: string; quantity: number }>;
}
