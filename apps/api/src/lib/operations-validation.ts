import { z } from "zod";

export const goodsReceiptIdSchema = z.object({
  id: z.string().uuid(),
});

export const deliveryIdSchema = z.object({
  id: z.string().uuid(),
});

export const goodsReceiptsListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["DRAFT", "RECEIVED", "CANCELLED"]).optional(),
});

export const deliveriesListSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(["DRAFT", "PICKED", "DELIVERED", "CANCELLED"]).optional(),
});

const goodsReceiptLineInputSchema = z.object({
  productId: z.string().uuid(),
  orderedQuantity: z.number().int().positive(),
  receivedQuantity: z.number().int().min(0).default(0),
  rejectedQuantity: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

export const createGoodsReceiptSchema = z.object({
  purchaseOrderId: z.string().uuid(),
  warehouseId: z.string().uuid().optional(),
  notes: z.string().optional(),
  lines: z.array(goodsReceiptLineInputSchema).min(1),
});

const deliveryLineInputSchema = z.object({
  productId: z.string().uuid(),
  orderedQuantity: z.number().int().positive(),
  deliveredQuantity: z.number().int().min(0).default(0),
  returnedQuantity: z.number().int().min(0).default(0),
  notes: z.string().optional(),
});

export const createDeliverySchema = z.object({
  salesOrderId: z.string().uuid(),
  warehouseId: z.string().uuid().optional(),
  status: z.enum(["DRAFT", "PICKED"]).optional(),
  notes: z.string().optional(),
  lines: z.array(deliveryLineInputSchema).min(1),
});
