import { PrismaClient, ProductStatus, StockMovementType } from "@prisma/client";

const ORG_ID = "00000000-0000-4000-8000-000000000001";
const INVENTORY_USER_ID = "00000000-0000-4000-8000-000000000022";

export const WAREHOUSE_IDS = {
  amman: "00000000-0000-4000-8000-000000000100",
  irbid: "00000000-0000-4000-8000-000000000101",
} as const;

const WAREHOUSES = [
  {
    id: WAREHOUSE_IDS.amman,
    code: "WH-AMM-01",
    name: "Amman Distribution Center",
    city: "Amman",
    branch: "Amman",
    address: "Industrial Zone, Sahab Road, Amman",
  },
  {
    id: WAREHOUSE_IDS.irbid,
    code: "WH-IRB-01",
    name: "Irbid Branch Warehouse",
    city: "Irbid",
    branch: "Irbid",
    address: "Hashmi Street, Irbid",
  },
];

const PRODUCTS = [
  {
    id: "00000000-0000-4000-8000-000000000200",
    sku: "FMCG-001",
    name: "Bottled Water 500ml",
    category: "Beverages",
    unit: "case",
    costPrice: 3.5,
    sellPrice: 4.75,
    reorderLevel: 200,
  },
  {
    id: "00000000-0000-4000-8000-000000000201",
    sku: "FMCG-002",
    name: "Energy Drink 250ml",
    category: "Beverages",
    unit: "case",
    costPrice: 8.2,
    sellPrice: 11.5,
    reorderLevel: 120,
  },
  {
    id: "00000000-0000-4000-8000-000000000202",
    sku: "FMCG-003",
    name: "Orange Juice 1L",
    category: "Beverages",
    unit: "case",
    costPrice: 6.8,
    sellPrice: 9.25,
    reorderLevel: 80,
  },
  {
    id: "00000000-0000-4000-8000-000000000203",
    sku: "GRC-010",
    name: "Sunflower Cooking Oil 1L",
    category: "Grocery",
    unit: "carton",
    costPrice: 12.5,
    sellPrice: 16.0,
    reorderLevel: 100,
  },
  {
    id: "00000000-0000-4000-8000-000000000204",
    sku: "GRC-011",
    name: "Basmati Rice 5kg",
    category: "Grocery",
    unit: "bag",
    costPrice: 9.75,
    sellPrice: 13.5,
    reorderLevel: 150,
  },
  {
    id: "00000000-0000-4000-8000-000000000205",
    sku: "GRC-012",
    name: "Tomato Paste 400g",
    category: "Grocery",
    unit: "carton",
    costPrice: 4.2,
    sellPrice: 5.9,
    reorderLevel: 90,
  },
  {
    id: "00000000-0000-4000-8000-000000000206",
    sku: "DRY-020",
    name: "Full Cream Milk 1L",
    category: "Dairy",
    unit: "case",
    costPrice: 5.6,
    sellPrice: 7.25,
    reorderLevel: 120,
  },
  {
    id: "00000000-0000-4000-8000-000000000207",
    sku: "DRY-021",
    name: "Labneh 500g",
    category: "Dairy",
    unit: "case",
    costPrice: 7.1,
    sellPrice: 9.5,
    reorderLevel: 60,
  },
  {
    id: "00000000-0000-4000-8000-000000000208",
    sku: "HHL-030",
    name: "Dishwashing Liquid 750ml",
    category: "Household",
    unit: "case",
    costPrice: 6.3,
    sellPrice: 8.75,
    reorderLevel: 70,
  },
  {
    id: "00000000-0000-4000-8000-000000000209",
    sku: "HHL-031",
    name: "Laundry Detergent 3kg",
    category: "Household",
    unit: "bag",
    costPrice: 11.8,
    sellPrice: 15.5,
    reorderLevel: 80,
  },
  {
    id: "00000000-0000-4000-8000-000000000210",
    sku: "HHL-032",
    name: "Paper Towels 6-pack",
    category: "Household",
    unit: "case",
    costPrice: 5.9,
    sellPrice: 7.95,
    reorderLevel: 50,
  },
  {
    id: "00000000-0000-4000-8000-000000000211",
    sku: "PC-040",
    name: "Shampoo 400ml",
    category: "Personal Care",
    unit: "case",
    costPrice: 10.2,
    sellPrice: 13.75,
    reorderLevel: 60,
  },
  {
    id: "00000000-0000-4000-8000-000000000212",
    sku: "PC-041",
    name: "Toothpaste 100ml",
    category: "Personal Care",
    unit: "case",
    costPrice: 4.8,
    sellPrice: 6.5,
    reorderLevel: 100,
  },
  {
    id: "00000000-0000-4000-8000-000000000213",
    sku: "ELC-050",
    name: "USB-C Cable 1m",
    category: "Electronics",
    unit: "box",
    costPrice: 2.4,
    sellPrice: 4.5,
    reorderLevel: 40,
  },
  {
    id: "00000000-0000-4000-8000-000000000214",
    sku: "ELC-051",
    name: "LED Bulb 9W",
    category: "Electronics",
    unit: "box",
    costPrice: 1.85,
    sellPrice: 3.25,
    reorderLevel: 80,
  },
  {
    id: "00000000-0000-4000-8000-000000000215",
    sku: "DRAFT-099",
    name: "Seasonal Gift Box (draft)",
    category: "Grocery",
    unit: "box",
    costPrice: 18.0,
    sellPrice: 24.0,
    reorderLevel: 0,
    status: ProductStatus.DRAFT,
  },
];

/** [productIndex, ammanQty, irbidQty, ammanReserved, irbidReserved] */
const STOCK_LEVELS: Array<[number, number, number, number?, number?]> = [
  [0, 840, 420, 40, 20],
  [1, 360, 180, 24, 12],
  [2, 220, 140, 0, 0],
  [3, 480, 260, 30, 15],
  [4, 620, 380, 50, 25],
  [5, 310, 190, 0, 0],
  [6, 400, 220, 20, 10],
  [7, 180, 95, 0, 0],
  [8, 260, 140, 15, 8],
  [9, 340, 175, 0, 0],
  [10, 150, 80, 0, 0],
  [11, 200, 110, 10, 5],
  [12, 380, 210, 0, 0],
  [13, 95, 60, 5, 0],
  [14, 420, 240, 0, 0],
  [15, 0, 0, 0, 0],
];

export async function seedInventory(prisma: PrismaClient) {
  for (const wh of WAREHOUSES) {
    await prisma.warehouse.upsert({
      where: { organizationId_code: { organizationId: ORG_ID, code: wh.code } },
      update: {
        name: wh.name,
        city: wh.city,
        branch: wh.branch,
        address: wh.address,
        isActive: true,
      },
      create: {
        id: wh.id,
        organizationId: ORG_ID,
        code: wh.code,
        name: wh.name,
        city: wh.city,
        branch: wh.branch,
        address: wh.address,
        isActive: true,
      },
    });
  }

  for (const product of PRODUCTS) {
    await prisma.product.upsert({
      where: { organizationId_sku: { organizationId: ORG_ID, sku: product.sku } },
      update: {
        name: product.name,
        category: product.category,
        unit: product.unit,
        costPrice: product.costPrice,
        sellPrice: product.sellPrice,
        reorderLevel: product.reorderLevel,
        status: product.status ?? ProductStatus.ACTIVE,
      },
      create: {
        id: product.id,
        organizationId: ORG_ID,
        sku: product.sku,
        name: product.name,
        description: `Al-Noor Trading · ${product.category}`,
        category: product.category,
        unit: product.unit,
        costPrice: product.costPrice,
        sellPrice: product.sellPrice,
        reorderLevel: product.reorderLevel,
        status: product.status ?? ProductStatus.ACTIVE,
      },
    });
  }

  for (const [idx, ammanQty, irbidQty, ammanRes = 0, irbidRes = 0] of STOCK_LEVELS) {
    const product = PRODUCTS[idx];

    for (const [warehouseId, qty, reserved] of [
      [WAREHOUSE_IDS.amman, ammanQty, ammanRes],
      [WAREHOUSE_IDS.irbid, irbidQty, irbidRes],
    ] as const) {
      await prisma.stockBalance.upsert({
        where: {
          productId_warehouseId: {
            productId: product.id,
            warehouseId,
          },
        },
        update: {
          quantityOnHand: qty,
          quantityReserved: reserved,
        },
        create: {
          organizationId: ORG_ID,
          productId: product.id,
          warehouseId,
          quantityOnHand: qty,
          quantityReserved: reserved,
        },
      });
    }
  }

  // Clear and re-seed movements for idempotency
  await prisma.stockMovement.deleteMany({ where: { organizationId: ORG_ID } });

  const movements: Array<{
    productId: string;
    warehouseId: string;
    toWarehouseId?: string;
    type: StockMovementType;
    quantity: number;
    reference: string;
    notes: string;
    daysAgo: number;
  }> = [
    {
      productId: PRODUCTS[0].id,
      warehouseId: WAREHOUSE_IDS.amman,
      type: StockMovementType.RECEIPT,
      quantity: 240,
      reference: "PO-2026-0087",
      notes: "Inbound from Al-Rashid Supplies",
      daysAgo: 0,
    },
    {
      productId: PRODUCTS[3].id,
      warehouseId: WAREHOUSE_IDS.amman,
      type: StockMovementType.ISSUE,
      quantity: 48,
      reference: "SO-2026-0194",
      notes: "Fulfillment for Jordan Foods Co.",
      daysAgo: 0,
    },
    {
      productId: PRODUCTS[6].id,
      warehouseId: WAREHOUSE_IDS.irbid,
      type: StockMovementType.RECEIPT,
      quantity: 120,
      reference: "PO-2026-0085",
      notes: "Dairy restock · Irbid branch",
      daysAgo: 1,
    },
    {
      productId: PRODUCTS[4].id,
      warehouseId: WAREHOUSE_IDS.amman,
      toWarehouseId: WAREHOUSE_IDS.irbid,
      type: StockMovementType.TRANSFER_OUT,
      quantity: 80,
      reference: "TR-2026-0041",
      notes: "Amman DC → Irbid branch transfer",
      daysAgo: 1,
    },
    {
      productId: PRODUCTS[4].id,
      warehouseId: WAREHOUSE_IDS.irbid,
      type: StockMovementType.TRANSFER_IN,
      quantity: 80,
      reference: "TR-2026-0041",
      notes: "Received from Amman DC",
      daysAgo: 1,
    },
    {
      productId: PRODUCTS[13].id,
      warehouseId: WAREHOUSE_IDS.amman,
      type: StockMovementType.ADJUSTMENT,
      quantity: -12,
      reference: "ADJ-2026-0012",
      notes: "Cycle count variance",
      daysAgo: 2,
    },
    {
      productId: PRODUCTS[1].id,
      warehouseId: WAREHOUSE_IDS.amman,
      type: StockMovementType.ISSUE,
      quantity: 36,
      reference: "SO-2026-0188",
      notes: "Metro Distributors order",
      daysAgo: 2,
    },
    {
      productId: PRODUCTS[8].id,
      warehouseId: WAREHOUSE_IDS.irbid,
      type: StockMovementType.RECEIPT,
      quantity: 60,
      reference: "PO-2026-0082",
      notes: "Household goods replenishment",
      daysAgo: 3,
    },
    {
      productId: PRODUCTS[11].id,
      warehouseId: WAREHOUSE_IDS.amman,
      type: StockMovementType.ISSUE,
      quantity: 24,
      reference: "SO-2026-0182",
      notes: "Gulf Retail Group shipment",
      daysAgo: 3,
    },
    {
      productId: PRODUCTS[14].id,
      warehouseId: WAREHOUSE_IDS.irbid,
      type: StockMovementType.RECEIPT,
      quantity: 200,
      reference: "PO-2026-0079",
      notes: "LED bulbs bulk purchase",
      daysAgo: 4,
    },
    {
      productId: PRODUCTS[2].id,
      warehouseId: WAREHOUSE_IDS.amman,
      type: StockMovementType.ISSUE,
      quantity: 40,
      reference: "SO-2026-0175",
      notes: "Nile Market weekly order",
      daysAgo: 4,
    },
    {
      productId: PRODUCTS[9].id,
      warehouseId: WAREHOUSE_IDS.amman,
      toWarehouseId: WAREHOUSE_IDS.irbid,
      type: StockMovementType.TRANSFER_OUT,
      quantity: 45,
      reference: "TR-2026-0038",
      notes: "Branch stock balancing",
      daysAgo: 5,
    },
    {
      productId: PRODUCTS[5].id,
      warehouseId: WAREHOUSE_IDS.amman,
      type: StockMovementType.RECEIPT,
      quantity: 150,
      reference: "PO-2026-0076",
      notes: "Grocery inbound shipment",
      daysAgo: 5,
    },
    {
      productId: PRODUCTS[12].id,
      warehouseId: WAREHOUSE_IDS.irbid,
      type: StockMovementType.ISSUE,
      quantity: 30,
      reference: "SO-2026-0168",
      notes: "Northern retailers batch",
      daysAgo: 6,
    },
    {
      productId: PRODUCTS[7].id,
      warehouseId: WAREHOUSE_IDS.amman,
      type: StockMovementType.ADJUSTMENT,
      quantity: 8,
      reference: "ADJ-2026-0009",
      notes: "Found stock during audit",
      daysAgo: 6,
    },
    {
      productId: PRODUCTS[10].id,
      warehouseId: WAREHOUSE_IDS.irbid,
      type: StockMovementType.ISSUE,
      quantity: 18,
      reference: "SO-2026-0162",
      notes: "Irbid retail partners",
      daysAgo: 7,
    },
  ];

  for (const m of movements) {
    await prisma.stockMovement.create({
      data: {
        organizationId: ORG_ID,
        productId: m.productId,
        warehouseId: m.warehouseId,
        toWarehouseId: m.toWarehouseId,
        type: m.type,
        quantity: m.quantity,
        reference: m.reference,
        notes: m.notes,
        createdById: INVENTORY_USER_ID,
        createdAt: new Date(Date.now() - m.daysAgo * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`  Warehouses: ${WAREHOUSES.length}`);
  console.log(`  Products: ${PRODUCTS.length}`);
  console.log(`  Stock balances: ${STOCK_LEVELS.length * 2}`);
  console.log(`  Movements: ${movements.length}`);
}
