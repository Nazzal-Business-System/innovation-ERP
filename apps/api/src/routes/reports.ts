import { Router } from "express";
import { REPORTS_PERMISSIONS } from "@ierp/shared";
import { prisma } from "../lib/prisma.js";
import { computeFinancialMetrics, computeInventoryValuation } from "../lib/financial-metrics.js";
import { isSupportTicketOverdue, localMonthKey } from "../lib/metric-math.js";
import { formatMoney as formatInventoryMoney } from "../lib/serialize-inventory.js";
import {
  EXPECTED_RECEIPT_STATUSES,
  formatMoney as formatProcurementMoney,
  OPEN_PO_STATUSES,
} from "../lib/serialize-procurement.js";
import { serializeFile } from "../lib/serialize-documents.js";
import { serializeArticle } from "../lib/serialize-knowledge.js";
import { formatMoney as formatSalesMoney, OPEN_SO_STATUSES } from "../lib/serialize-sales.js";
import { authenticate, requireJwtConfigured, type AuthenticatedRequest } from "../middleware/auth.js";
import { requirePermission } from "../middleware/require-permission.js";
import { asyncHandler } from "../middleware/error-handler.js";

const router = Router();

function formatMoney(value: number): string {
  return `JOD ${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const REPORT_DEFINITIONS = [
  {
    id: "sales-summary",
    name: "Sales Summary",
    description: "Revenue, orders, customers, and regional sales performance",
    category: "Sales & Revenue",
    href: "/dashboard/reports/sales-summary",
    icon: "shopping-cart",
  },
  {
    id: "inventory-valuation",
    name: "Inventory Valuation",
    description: "Stock value by warehouse, category, and low-stock alerts",
    category: "Inventory",
    href: "/dashboard/reports/inventory-valuation",
    icon: "boxes",
  },
  {
    id: "procurement-summary",
    name: "Procurement Summary",
    description: "Vendor spend, PO status, and expected receipts",
    category: "Procurement",
    href: "/dashboard/reports/procurement-summary",
    icon: "truck",
  },
  {
    id: "financial-summary",
    name: "Financial Summary",
    description: "Assets, liabilities, P&L, and trial balance status",
    category: "Financial",
    href: "/dashboard/reports/financial-summary",
    icon: "calculator",
  },
  {
    id: "projects-summary",
    name: "Projects Summary",
    description: "Active projects, task completion, milestones, and budget utilization",
    category: "Projects",
    href: "/dashboard/reports/projects-summary",
    icon: "folder-kanban",
  },
  {
    id: "support-summary",
    name: "Support Summary",
    description: "Ticket volume, SLA compliance, status and priority breakdown",
    category: "Support",
    href: "/dashboard/reports/support-summary",
    icon: "headphones",
  },
  {
    id: "documents-summary",
    name: "Documents Summary",
    description: "Document counts, expiry risk, module distribution, and pending review",
    category: "Documents",
    href: "/dashboard/reports/documents-summary",
    icon: "file-text",
  },
  {
    id: "knowledge-summary",
    name: "Knowledge Summary",
    description: "Article counts, publication status, top categories, and support links",
    category: "Knowledge",
    href: "/dashboard/reports/knowledge-summary",
    icon: "book-open",
  },
] as const;

function buildReportCategories() {
  const categoryMap = new Map<string, typeof REPORT_DEFINITIONS[number][]>();
  for (const report of REPORT_DEFINITIONS) {
    const list = categoryMap.get(report.category) ?? [];
    list.push(report);
    categoryMap.set(report.category, list);
  }
  return Array.from(categoryMap.entries()).map(([name, reports]) => ({
    id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name,
    reportCount: reports.length,
    reports: [...reports],
  }));
}

router.use(requireJwtConfigured);
router.use(authenticate);
router.use(requirePermission(REPORTS_PERMISSIONS.READ));

router.get(
  "/overview",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const generatedAt = new Date().toISOString();

    const [
      salesAgg,
      procurementAgg,
      openSalesOrders,
      openPurchaseOrders,
      products,
      inventory,
      financial,
    ] = await Promise.all([
      prisma.salesOrder.aggregate({
        where: {
          organizationId: orgId,
          status: { notIn: ["CANCELLED", "DRAFT"] },
        },
        _sum: { totalAmount: true },
      }),
      prisma.purchaseOrder.aggregate({
        where: {
          organizationId: orgId,
          status: { notIn: ["CANCELLED", "DRAFT"] },
        },
        _sum: { totalAmount: true },
      }),
      prisma.salesOrder.count({
        where: {
          organizationId: orgId,
          status: { in: OPEN_SO_STATUSES },
        },
      }),
      prisma.purchaseOrder.count({
        where: { organizationId: orgId, status: { in: OPEN_PO_STATUSES } },
      }),
      prisma.product.findMany({
        where: { organizationId: orgId, status: "ACTIVE", isArchived: false },
        select: {
          reorderLevel: true,
          stockBalances: { select: { quantityOnHand: true } },
        },
      }),
      computeInventoryValuation(orgId),
      computeFinancialMetrics(orgId),
    ]);

    const totalSales = Number(salesAgg._sum.totalAmount ?? 0);
    const procurementSpend = Number(procurementAgg._sum.totalAmount ?? 0);

    let lowStockItems = 0;
    for (const product of products) {
      const onHand = product.stockBalances.reduce((s, b) => s + b.quantityOnHand, 0);
      if (onHand <= product.reorderLevel) {
        lowStockItems += 1;
      }
    }
    const inventoryValue = inventory.totalInventoryValue;

    const recentReports = REPORT_DEFINITIONS.map((report) => ({
      id: report.id,
      name: report.name,
      category: report.category,
      generatedAt,
      href: report.href,
    }));

    res.json({
      totalReports: REPORT_DEFINITIONS.length,
      availableReports: [...REPORT_DEFINITIONS],
      lastGeneratedAt: generatedAt,
      executiveSummary: {
        totalSales: formatSalesMoney(totalSales),
        inventoryValue: formatInventoryMoney(inventoryValue),
        procurementSpend: formatProcurementMoney(procurementSpend),
        netProfit: formatMoney(financial.netProfit),
        openSalesOrders,
        openPurchaseOrders,
        lowStockItems,
      },
      reportCategories: buildReportCategories(),
      recentReports,
    });
  })
);

router.get(
  "/sales-summary",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const generatedAt = new Date().toISOString();

    const [customers, salesOrders, statusGroups] = await Promise.all([
      prisma.customer.findMany({ where: { organizationId: orgId } }),
      prisma.salesOrder.findMany({
        where: { organizationId: orgId },
        include: { customer: true },
        orderBy: { orderDate: "desc" },
      }),
      prisma.salesOrder.groupBy({
        by: ["status"],
        where: { organizationId: orgId },
        _count: { status: true },
      }),
    ]);

    const counted = salesOrders.filter((so) => so.status !== "CANCELLED" && so.status !== "DRAFT");
    const totalSales = counted.reduce((s, so) => s + Number(so.totalAmount), 0);
    const averageOrderValue = counted.length > 0 ? totalSales / counted.length : 0;

    const statusAmounts = new Map<string, number>();
    for (const so of salesOrders) {
      statusAmounts.set(so.status, (statusAmounts.get(so.status) ?? 0) + Number(so.totalAmount));
    }

    const customerStats = new Map<string, { sales: number; orders: number }>();
    for (const customer of customers) {
      customerStats.set(customer.id, { sales: 0, orders: 0 });
    }
    for (const so of counted) {
      const stat = customerStats.get(so.customerId);
      if (!stat) continue;
      stat.sales += Number(so.totalAmount);
      stat.orders += 1;
    }

    const topCustomers = customers
      .map((customer) => {
        const stat = customerStats.get(customer.id) ?? { sales: 0, orders: 0 };
        return {
          id: customer.id,
          code: customer.code,
          name: customer.name,
          totalSales: formatSalesMoney(stat.sales),
          orderCount: stat.orders,
        };
      })
      .filter((c) => c.orderCount > 0)
      .sort((a, b) => {
        const aVal = customerStats.get(a.id)?.sales ?? 0;
        const bVal = customerStats.get(b.id)?.sales ?? 0;
        return bVal - aVal;
      })
      .slice(0, 8);

    const cityMap = new Map<string, { orders: number; sales: number }>();
    for (const so of counted) {
      const city = so.customer.city ?? "Unknown";
      const entry = cityMap.get(city) ?? { orders: 0, sales: 0 };
      entry.orders += 1;
      entry.sales += Number(so.totalAmount);
      cityMap.set(city, entry);
    }

    const salesByCity = Array.from(cityMap.entries())
      .map(([city, data]) => ({
        city,
        orderCount: data.orders,
        totalSales: formatSalesMoney(data.sales),
      }))
      .sort((a, b) => {
        const aCity = cityMap.get(a.city)?.sales ?? 0;
        const bCity = cityMap.get(b.city)?.sales ?? 0;
        return bCity - aCity;
      });

    const monthMap = new Map<string, number>();
    for (const so of counted) {
      const month = localMonthKey(so.orderDate);
      monthMap.set(month, (monthMap.get(month) ?? 0) + Number(so.totalAmount));
    }
    const monthlySalesTrend = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([label, value]) => ({ label, value }));

    res.json({
      totalSales: formatSalesMoney(totalSales),
      orderCount: counted.length,
      averageOrderValue: formatSalesMoney(averageOrderValue),
      salesByStatus: statusGroups.map((g) => ({
        status: g.status,
        count: g._count.status,
        amount: formatSalesMoney(statusAmounts.get(g.status) ?? 0),
      })),
      topCustomers,
      salesByCity,
      monthlySalesTrend,
      generatedAt,
    });
  })
);

router.get(
  "/inventory-valuation",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const generatedAt = new Date().toISOString();

    const [products, warehouses, stockBalances] = await Promise.all([
      prisma.product.findMany({
        where: { organizationId: orgId, isArchived: false, status: "ACTIVE" },
        include: { stockBalances: true },
      }),
      prisma.warehouse.findMany({
        where: { organizationId: orgId, isActive: true },
        include: {
          stockBalances: {
            where: { product: { isArchived: false, status: "ACTIVE" } },
            include: { product: true },
          },
        },
      }),
      prisma.stockBalance.findMany({
        where: {
          organizationId: orgId,
          product: { isArchived: false, status: "ACTIVE" },
        },
        include: { product: true },
      }),
    ]);

    let totalUnits = 0;
    let totalInventoryValue = 0;
    const categoryMap = new Map<string, { units: number; value: number }>();

    for (const balance of stockBalances) {
      totalUnits += balance.quantityOnHand;
      const value = balance.quantityOnHand * Number(balance.product.costPrice);
      totalInventoryValue += value;
      const cat = categoryMap.get(balance.product.category) ?? { units: 0, value: 0 };
      cat.units += balance.quantityOnHand;
      cat.value += value;
      categoryMap.set(balance.product.category, cat);
    }

    const lowStockItems = products
      .map((product) => {
        const onHand = product.stockBalances.reduce((s, b) => s + b.quantityOnHand, 0);
        const value = onHand * Number(product.costPrice);
        return { product, onHand, value };
      })
      .filter(({ product, onHand }) => product.status === "ACTIVE" && onHand <= product.reorderLevel)
      .map(({ product, onHand, value }) => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        onHand,
        reorderLevel: product.reorderLevel,
        value: formatInventoryMoney(value),
      }))
      .sort((a, b) => a.onHand - b.onHand);

    const valueByWarehouse = warehouses.map((wh) => {
      let units = 0;
      let value = 0;
      for (const b of wh.stockBalances) {
        units += b.quantityOnHand;
        value += b.quantityOnHand * Number(b.product.costPrice);
      }
      return {
        id: wh.id,
        code: wh.code,
        name: wh.name,
        totalUnits: units,
        totalValue: formatInventoryMoney(value),
      };
    });

    const valueByCategory = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        totalUnits: data.units,
        totalValue: formatInventoryMoney(data.value),
      }))
      .sort((a, b) => {
        const aVal = categoryMap.get(a.category)?.value ?? 0;
        const bVal = categoryMap.get(b.category)?.value ?? 0;
        return bVal - aVal;
      });

    const topValueProducts = products
      .map((product) => {
        const onHand = product.stockBalances.reduce((s, b) => s + b.quantityOnHand, 0);
        const totalValue = onHand * Number(product.costPrice);
        return { product, onHand, totalValue };
      })
      .filter((p) => p.totalValue > 0)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10)
      .map(({ product, onHand, totalValue }) => ({
        id: product.id,
        sku: product.sku,
        name: product.name,
        onHand,
        unitCost: formatInventoryMoney(Number(product.costPrice)),
        totalValue: formatInventoryMoney(totalValue),
      }));

    res.json({
      totalInventoryValue: formatInventoryMoney(totalInventoryValue),
      totalUnits,
      lowStockItems,
      valueByWarehouse,
      valueByCategory,
      topValueProducts,
      generatedAt,
    });
  })
);

router.get(
  "/procurement-summary",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const now = new Date();
    const generatedAt = now.toISOString();

    const [vendors, purchaseOrders, statusGroups] = await Promise.all([
      prisma.vendor.findMany({ where: { organizationId: orgId } }),
      prisma.purchaseOrder.findMany({
        where: { organizationId: orgId },
        include: { vendor: true },
        orderBy: { orderDate: "desc" },
      }),
      prisma.purchaseOrder.groupBy({
        by: ["status"],
        where: { organizationId: orgId },
        _count: { status: true },
      }),
    ]);

    const counted = purchaseOrders.filter((po) => po.status !== "CANCELLED" && po.status !== "DRAFT");
    const totalSpend = counted.reduce((s, po) => s + Number(po.totalAmount), 0);
    const openPurchaseOrders = purchaseOrders.filter((po) => OPEN_PO_STATUSES.includes(po.status)).length;

    const statusAmounts = new Map<string, number>();
    for (const po of purchaseOrders) {
      statusAmounts.set(po.status, (statusAmounts.get(po.status) ?? 0) + Number(po.totalAmount));
    }

    const vendorStats = new Map<string, { spend: number; orders: number; vendor: (typeof vendors)[0] }>();
    for (const vendor of vendors) {
      vendorStats.set(vendor.id, { spend: 0, orders: 0, vendor });
    }
    for (const po of counted) {
      const stat = vendorStats.get(po.vendorId);
      if (!stat) continue;
      stat.spend += Number(po.totalAmount);
      stat.orders += 1;
    }

    const spendByVendor = Array.from(vendorStats.values())
      .filter((v) => v.spend > 0)
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 8)
      .map(({ vendor, spend, orders }) => ({
        id: vendor.id,
        code: vendor.code,
        name: vendor.name,
        totalSpend: formatProcurementMoney(spend),
        orderCount: orders,
      }));

    const expectedReceipts = purchaseOrders
      .filter(
        (po) =>
          EXPECTED_RECEIPT_STATUSES.includes(po.status) &&
          po.expectedDate &&
          po.expectedDate >= now
      )
      .sort((a, b) => a.expectedDate!.getTime() - b.expectedDate!.getTime())
      .slice(0, 10)
      .map((po) => ({
        id: po.id,
        poNumber: po.poNumber,
        vendorName: po.vendor.name,
        expectedDate: po.expectedDate!.toISOString().slice(0, 10),
        totalAmount: formatProcurementMoney(Number(po.totalAmount)),
        status: po.status,
      }));

    res.json({
      totalProcurementSpend: formatProcurementMoney(totalSpend),
      purchaseOrderCount: counted.length,
      openPurchaseOrders,
      spendByVendor,
      purchaseOrdersByStatus: statusGroups.map((g) => ({
        status: g.status,
        count: g._count.status,
        amount: formatProcurementMoney(statusAmounts.get(g.status) ?? 0),
      })),
      expectedReceipts,
      generatedAt,
    });
  })
);

router.get(
  "/financial-summary",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const generatedAt = new Date().toISOString();
    const financial = await computeFinancialMetrics(orgId);

    res.json({
      periodLabel: financial.periodLabel,
      assets: formatMoney(financial.assets),
      liabilities: formatMoney(financial.liabilities),
      equity: formatMoney(financial.equity),
      revenue: formatMoney(financial.revenue),
      expenses: formatMoney(financial.expenses),
      netProfit: formatMoney(financial.netProfit),
      trialBalanceStatus: financial.trialBalanceStatus,
      expenseBreakdown: financial.expenseBreakdown,
      revenueTrend: financial.revenueTrend,
      generatedAt,
    });
  })
);

router.get(
  "/projects-summary",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const generatedAt = new Date().toISOString();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [projects, tasks, milestones] = await Promise.all([
      prisma.project.findMany({ where: { organizationId: orgId } }),
      prisma.projectTask.findMany({ where: { organizationId: orgId } }),
      prisma.projectMilestone.findMany({ where: { organizationId: orgId } }),
    ]);

    const activeProjects = projects.filter((p) => p.status === "ACTIVE").length;
    const completedProjects = projects.filter((p) => p.status === "COMPLETED").length;
    const totalBudget = projects.reduce((s, p) => s + Number(p.budget), 0);
    const averageProgress =
      projects.length > 0 ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
    const openTasks = tasks.filter((t) => t.status !== "DONE").length;
    const completedTasks = tasks.filter((t) => t.status === "DONE").length;
    const overdueMilestones = milestones.filter(
      (m) =>
        m.status === "MISSED" || (m.status === "PENDING" && m.dueDate && m.dueDate < today)
    ).length;

    const statusMap = new Map<string, number>();
    for (const p of projects) statusMap.set(p.status, (statusMap.get(p.status) ?? 0) + 1);

    const taskStatusMap = new Map<string, number>();
    for (const t of tasks) taskStatusMap.set(t.status, (taskStatusMap.get(t.status) ?? 0) + 1);

    const topProjectsByBudget = [...projects]
      .sort((a, b) => Number(b.budget) - Number(a.budget))
      .slice(0, 8)
      .map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        budget: formatMoney(Number(p.budget)),
        progress: p.progress,
        status: p.status,
      }));

    res.json({
      totalProjects: projects.length,
      activeProjects,
      completedProjects,
      totalBudget: formatMoney(totalBudget),
      averageProgress,
      openTasks,
      completedTasks,
      overdueMilestones,
      projectsByStatus: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
      tasksByStatus: Array.from(taskStatusMap.entries()).map(([status, count]) => ({ status, count })),
      topProjectsByBudget,
      generatedAt,
    });
  })
);

router.get(
  "/support-summary",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const generatedAt = new Date().toISOString();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [tickets, categories] = await Promise.all([
      prisma.supportTicket.findMany({
        where: { organizationId: orgId },
        include: { category: true },
      }),
      prisma.supportCategory.findMany({ where: { organizationId: orgId } }),
    ]);

    const openStatuses = ["OPEN", "IN_PROGRESS", "WAITING_CUSTOMER"];
    const openTickets = tickets.filter((t) => openStatuses.includes(t.status));
    const overdueTickets = tickets.filter((t) => isSupportTicketOverdue(t.status, t.dueAt, today));
    const criticalTickets = openTickets.filter((t) => t.priority === "CRITICAL");

    const statusMap = new Map<string, number>();
    const priorityMap = new Map<string, number>();
    const categoryCountMap = new Map<string, number>();

    for (const ticket of tickets) {
      statusMap.set(ticket.status, (statusMap.get(ticket.status) ?? 0) + 1);
      priorityMap.set(ticket.priority, (priorityMap.get(ticket.priority) ?? 0) + 1);
      if (ticket.categoryId) {
        categoryCountMap.set(
          ticket.categoryId,
          (categoryCountMap.get(ticket.categoryId) ?? 0) + 1
        );
      }
    }

    const resolvedWithDue = tickets.filter(
      (t) => t.resolvedAt && t.dueAt && ["RESOLVED", "CLOSED"].includes(t.status)
    );
    const slaMet = resolvedWithDue.filter((t) => t.resolvedAt! <= t.dueAt!).length;
    const slaCompliancePercent =
      resolvedWithDue.length > 0 ? Math.round((slaMet / resolvedWithDue.length) * 100) : 100;

    let totalResolutionHours = 0;
    let resolvedCount = 0;
    for (const t of tickets) {
      if (t.resolvedAt) {
        totalResolutionHours += (t.resolvedAt.getTime() - t.openedAt.getTime()) / (1000 * 60 * 60);
        resolvedCount++;
      }
    }
    const avgResolutionHours =
      resolvedCount > 0 ? Math.round((totalResolutionHours / resolvedCount) * 10) / 10 : 0;

    const topCategories = categories
      .map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        count: categoryCountMap.get(c.id) ?? 0,
      }))
      .filter((c) => c.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    const overdueList = overdueTickets
      .sort((a, b) => (a.dueAt?.getTime() ?? 0) - (b.dueAt?.getTime() ?? 0))
      .slice(0, 10)
      .map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        title: t.title,
        dueAt: t.dueAt?.toISOString() ?? null,
        priority: t.priority,
      }));

    res.json({
      totalTickets: tickets.length,
      openTickets: openTickets.length,
      overdueTickets: overdueTickets.length,
      criticalTickets: criticalTickets.length,
      avgResolutionHours,
      slaCompliancePercent,
      ticketsByStatus: Array.from(statusMap.entries()).map(([status, count]) => ({ status, count })),
      ticketsByPriority: Array.from(priorityMap.entries()).map(([priority, count]) => ({
        priority,
        count,
      })),
      topCategories,
      overdueList,
      generatedAt,
    });
  })
);

router.get(
  "/documents-summary",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const generatedAt = new Date().toISOString();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30 = new Date(today);
    in30.setDate(in30.getDate() + 30);

    const [files, categories] = await Promise.all([
      prisma.documentFile.findMany({
        where: { organizationId: orgId },
        include: {
          category: true,
          uploadedBy: true,
          links: true,
          _count: { select: { links: true } },
        },
        orderBy: { uploadedAt: "desc" },
      }),
      prisma.documentCategory.findMany({ where: { organizationId: orgId } }),
    ]);

    const activeDocuments = files.filter((f) => f.status === "ACTIVE").length;
    const expiredDocuments = files.filter((f) => f.status === "EXPIRED").length;
    const pendingReview = files.filter((f) => f.status === "PENDING_REVIEW").length;

    const moduleMap = new Map<string, number>();
    const categoryCountMap = new Map<string, number>();

    for (const file of files) {
      for (const link of file.links) {
        moduleMap.set(link.module, (moduleMap.get(link.module) ?? 0) + 1);
      }
      if (file.categoryId) {
        categoryCountMap.set(
          file.categoryId,
          (categoryCountMap.get(file.categoryId) ?? 0) + 1
        );
      }
    }

    const expiringSoonList = files.filter(
      (f) =>
        f.expiryDate &&
        f.expiryDate >= today &&
        f.expiryDate <= in30 &&
        f.status !== "ARCHIVED" &&
        f.status !== "EXPIRED"
    );

    res.json({
      generatedAt,
      totalDocuments: files.length,
      activeDocuments,
      expiredDocuments,
      pendingReview,
      expiringIn30Days: expiringSoonList.length,
      documentsByModule: Array.from(moduleMap.entries()).map(([module, count]) => ({
        module,
        count,
      })),
      documentsByCategory: categories
        .map((c) => ({
          categoryId: c.id,
          categoryName: c.name,
          count: categoryCountMap.get(c.id) ?? 0,
        }))
        .filter((c) => c.count > 0),
      pendingReviewList: files
        .filter((f) => f.status === "PENDING_REVIEW")
        .slice(0, 10)
        .map((f) => serializeFile(f)),
      expiredList: files
        .filter((f) => f.status === "EXPIRED")
        .slice(0, 10)
        .map((f) => serializeFile(f)),
      expiringSoonList: expiringSoonList.slice(0, 10).map((f) => serializeFile(f)),
    });
  })
);

router.get(
  "/knowledge-summary",
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const orgId = req.user!.organizationId;
    const generatedAt = new Date().toISOString();

    const articles = await prisma.knowledgeArticle.findMany({
      where: { organizationId: orgId },
      include: {
        category: true,
        author: true,
        tags: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    const publishedArticles = articles.filter((a) => a.status === "PUBLISHED").length;
    const reviewArticles = articles.filter((a) => a.status === "REVIEW").length;
    const draftArticles = articles.filter((a) => a.status === "DRAFT").length;
    const archivedArticles = articles.filter((a) => a.status === "ARCHIVED").length;

    const categoryMap = new Map<string, { name: string; count: number }>();
    for (const article of articles) {
      if (article.category) {
        const existing = categoryMap.get(article.category.id) ?? {
          name: article.category.name,
          count: 0,
        };
        categoryMap.set(article.category.id, { ...existing, count: existing.count + 1 });
      }
    }

    const supportLinkedArticles = await prisma.knowledgeArticleSupportTicket.count({
      where: { organizationId: orgId },
    });

    res.json({
      generatedAt,
      totalArticles: articles.length,
      publishedArticles,
      reviewArticles,
      draftArticles,
      archivedArticles,
      topCategories: Array.from(categoryMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map((c) => ({ name: c.name, count: c.count })),
      supportLinkedArticles,
      recentArticles: articles.slice(0, 8).map(serializeArticle),
    });
  })
);

export default router;
