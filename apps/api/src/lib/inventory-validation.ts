import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const productsListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "DISCONTINUED", "DRAFT"]).optional(),
  archived: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
  lowStock: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
});

export const movementsListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  type: z
    .enum(["RECEIPT", "ISSUE", "TRANSFER_IN", "TRANSFER_OUT", "ADJUSTMENT"])
    .optional(),
  warehouseId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
});

export const productIdSchema = z.object({
  id: z.string().uuid("Invalid product id"),
});

export const warehouseIdSchema = z.object({
  id: z.string().uuid("Invalid warehouse id"),
});

export const warehousesListSchema = z.object({
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const reservationsListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(["ACTIVE", "RELEASED", "CONSUMED", "CANCELLED"]).optional(),
  warehouseId: z.string().uuid().optional(),
});

export const reservationIdSchema = z.object({
  id: z.string().uuid("Invalid reservation id"),
});

export const transfersListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z.enum(["DRAFT", "IN_TRANSIT", "COMPLETED", "CANCELLED"]).optional(),
  sourceWarehouseId: z.string().uuid().optional(),
  destinationWarehouseId: z.string().uuid().optional(),
});

export const transferIdSchema = z.object({
  id: z.string().uuid("Invalid transfer id"),
});

export const createTransferSchema = z.object({
  sourceWarehouseId: z.string().uuid(),
  destinationWarehouseId: z.string().uuid(),
  transferDate: z.string().optional(),
  notes: z.string().trim().optional(),
  lines: z
    .array(
      z.object({
        productId: z.string().uuid(),
        quantity: z.coerce.number().int().min(1),
      })
    )
    .min(1),
});

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    category: z.string().trim().min(1).max(120).optional(),
    unit: z.string().trim().min(1).max(40).optional(),
    costPrice: z.number().min(0).optional(),
    sellPrice: z.number().min(0).optional(),
    reorderLevel: z.number().int().min(0).optional(),
    status: z.enum(["ACTIVE", "DISCONTINUED", "DRAFT"]).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });

export const updateWarehouseSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    city: z.string().trim().min(1).max(120).optional(),
    branch: z.string().trim().min(1).max(120).optional(),
    address: z.string().trim().max(500).nullable().optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });
