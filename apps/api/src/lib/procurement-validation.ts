import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const vendorsListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const purchaseOrdersListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z
    .enum(["DRAFT", "SENT", "APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"])
    .optional(),
  vendorId: z.string().uuid().optional(),
});

export const vendorIdSchema = z.object({
  id: z.string().uuid("Invalid vendor id"),
});

export const purchaseOrderIdSchema = z.object({
  id: z.string().uuid("Invalid purchase order id"),
});

export const updatePurchaseOrderStatusSchema = z.object({
  status: z.enum(["DRAFT", "SENT", "APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "CANCELLED"]),
});

export const createPurchaseOrderLineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  unitCost: z.number().min(0),
});

export const createPurchaseOrderSchema = z.object({
  vendorId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  expectedDate: z.string().datetime().optional(),
  notes: z.string().trim().optional(),
  lines: z.array(createPurchaseOrderLineSchema).min(1),
});

export const createVendorSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contactName: z.string().trim().max(200).nullable().optional(),
  email: z
    .union([z.string().trim().email(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  phone: z.string().trim().max(50).nullable().optional(),
  city: z.string().trim().min(1).max(120),
  paymentTerms: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(5000).nullable().optional(),
  code: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "Invalid vendor code")
    .optional(),
});

export const updateVendorSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    contactName: z.string().trim().max(200).nullable().optional(),
    email: z
      .union([z.string().trim().email(), z.literal(""), z.null()])
      .optional()
      .transform((v) => (v === "" ? null : v)),
    phone: z.string().trim().max(50).nullable().optional(),
    city: z.string().trim().min(1).max(120).optional(),
    paymentTerms: z.string().trim().min(1).max(120).optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });
