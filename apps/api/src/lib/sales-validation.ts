import { z } from "zod";

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const customersListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  customerType: z.enum(["RETAILER", "WHOLESALER", "CORPORATE", "DISTRIBUTOR"]).optional(),
  sort: z
    .enum([
      "NEWEST",
      "OLDEST",
      "NAME_ASC",
      "NAME_DESC",
      "CODE_ASC",
      "CODE_DESC",
      "CREDIT_DESC",
      "CREDIT_ASC",
    ])
    .default("NEWEST"),
  active: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === "true")),
});

export const salesOrdersListSchema = paginationSchema.extend({
  search: z.string().trim().optional(),
  status: z
    .enum([
      "DRAFT",
      "CONFIRMED",
      "PICKING",
      "READY_TO_SHIP",
      "DELIVERED",
      "INVOICED",
      "CANCELLED",
    ])
    .optional(),
  customerId: z.string().uuid().optional(),
});

export const customerIdSchema = z.object({
  id: z.string().uuid("Invalid customer id"),
});

export const salesOrderIdSchema = z.object({
  id: z.string().uuid("Invalid sales order id"),
});

export const updateSalesOrderStatusSchema = z.object({
  status: z.enum([
    "DRAFT",
    "CONFIRMED",
    "PICKING",
    "READY_TO_SHIP",
    "DELIVERED",
    "INVOICED",
    "CANCELLED",
  ]),
});

export const createSalesOrderLineSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
});

export const createSalesOrderSchema = z.object({
  customerId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  expectedDeliveryDate: z.string().datetime().optional(),
  notes: z.string().trim().optional(),
  lines: z.array(createSalesOrderLineSchema).min(1),
});

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1).max(200),
  contactName: z.string().trim().max(200).nullable().optional(),
  email: z
    .union([z.string().trim().email(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  phone: z.string().trim().max(50).nullable().optional(),
  city: z.string().trim().min(1).max(120),
  customerType: z.enum(["RETAILER", "WHOLESALER", "CORPORATE", "DISTRIBUTOR"]),
  paymentTerms: z.string().trim().min(1).max(120),
  creditLimit: z.number().min(0),
  notes: z.string().trim().max(5000).nullable().optional(),
  code: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "Invalid customer code")
    .optional(),
});

export const updateCustomerSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    contactName: z.string().trim().max(200).nullable().optional(),
    email: z
      .union([z.string().trim().email(), z.literal(""), z.null()])
      .optional()
      .transform((v) => (v === "" ? null : v)),
    phone: z.string().trim().max(50).nullable().optional(),
    city: z.string().trim().min(1).max(120).optional(),
    customerType: z.enum(["RETAILER", "WHOLESALER", "CORPORATE", "DISTRIBUTOR"]).optional(),
    paymentTerms: z.string().trim().min(1).max(120).optional(),
    creditLimit: z.number().min(0).optional(),
    notes: z.string().trim().max(5000).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field is required" });
