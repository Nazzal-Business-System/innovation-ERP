import {
  ACCOUNTING_PERMISSIONS,
  CRM_PERMISSIONS,
  DOCUMENTS_PERMISSIONS,
  FINANCE_PERMISSIONS,
  HR_PERMISSIONS,
  INVENTORY_PERMISSIONS,
  KNOWLEDGE_PERMISSIONS,
  OPERATIONS_PERMISSIONS,
  PROCUREMENT_PERMISSIONS,
  PROJECTS_PERMISSIONS,
  SALES_PERMISSIONS,
  SEARCH_MODULE_LABELS,
  SEARCH_MODULE_ORDER,
  SUPPORT_PERMISSIONS,
  groupSearchResults,
  hasPermission,
  looksLikeRecordCode,
  scoreSearchFields,
  type GlobalSearchResult,
  type GlobalSearchResponse,
  type SearchResultModule,
  type SearchResultType,
  type SearchScoreField,
} from "@ierp/shared";
import type { PrismaClient } from "@prisma/client";

type Perms = string[];

function can(permissions: Perms, ...required: string[]): boolean {
  return hasPermission(permissions, ...required);
}

function contains(q: string) {
  return { contains: q, mode: "insensitive" as const };
}

function resultOf(input: {
  id: string;
  entityType: SearchResultType;
  module: SearchResultModule;
  title: string;
  subtitle: string;
  route: string;
  fields: SearchScoreField[];
  code?: string | null;
  status?: string | null;
  iconKey?: string;
  metadata?: Record<string, string>;
  query: string;
}): GlobalSearchResult | null {
  const scored = scoreSearchFields(input.query, input.fields);
  if (scored.score <= 0) return null;
  return {
    id: input.id,
    kind: "record",
    entityType: input.entityType,
    type: input.entityType,
    module: input.module,
    title: input.title,
    subtitle: input.subtitle,
    code: input.code ?? null,
    status: input.status ?? null,
    route: input.route,
    score: scored.score,
    matchedField: scored.matchedField,
    matchedSnippet: scored.matchedSnippet,
    iconKey: input.iconKey ?? input.entityType,
    metadata: input.metadata,
  };
}

export async function runGlobalSearch(options: {
  prisma: PrismaClient;
  organizationId: string;
  permissions: string[];
  query: string;
  limit: number;
}): Promise<GlobalSearchResponse> {
  const { prisma, organizationId: orgId, permissions, query, limit } = options;
  const q = query.trim();
  const codeBias = looksLikeRecordCode(q);
  const perType = codeBias
    ? Math.max(4, Math.min(8, Math.ceil(limit / 6)))
    : Math.max(3, Math.min(6, Math.ceil(limit / 8)));

  const tasks: Array<Promise<GlobalSearchResult[]>> = [];

  const push = (promise: Promise<GlobalSearchResult[]>) => {
    tasks.push(promise);
  };

  if (can(permissions, INVENTORY_PERMISSIONS.READ)) {
    push(
      prisma.product
        .findMany({
          where: {
            organizationId: orgId,
            isArchived: false,
            OR: [{ sku: contains(q) }, { name: contains(q) }, { category: contains(q) }],
          },
          select: { id: true, sku: true, name: true, status: true, category: true },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((p) =>
              resultOf({
                id: p.id,
                entityType: "product",
                module: "INVENTORY",
                title: p.name,
                subtitle: [p.sku, p.category].filter(Boolean).join(" · "),
                code: p.sku,
                status: p.status,
                route: `/dashboard/inventory/products/${p.id}`,
                query: q,
                fields: [
                  { field: "sku", value: p.sku, kind: "code" },
                  { field: "name", value: p.name, kind: "title" },
                  { field: "category", value: p.category, kind: "related" },
                  { field: "status", value: p.status, kind: "status" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );

    push(
      prisma.warehouse
        .findMany({
          where: {
            organizationId: orgId,
            isActive: true,
            OR: [{ code: contains(q) }, { name: contains(q) }, { city: contains(q) }],
          },
          select: { id: true, code: true, name: true, city: true },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((w) =>
              resultOf({
                id: w.id,
                entityType: "warehouse",
                module: "INVENTORY",
                title: w.name,
                subtitle: [w.code, w.city].filter(Boolean).join(" · "),
                code: w.code,
                route: `/dashboard/inventory/warehouses/${w.id}`,
                query: q,
                fields: [
                  { field: "code", value: w.code, kind: "code" },
                  { field: "name", value: w.name, kind: "title" },
                  { field: "city", value: w.city, kind: "related" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );

    push(
      prisma.warehouseTransfer
        .findMany({
          where: {
            organizationId: orgId,
            OR: [
              { transferNumber: contains(q) },
              { sourceWarehouse: { name: contains(q) } },
              { destinationWarehouse: { name: contains(q) } },
            ],
          },
          select: {
            id: true,
            transferNumber: true,
            status: true,
            sourceWarehouse: { select: { name: true } },
            destinationWarehouse: { select: { name: true } },
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((t) =>
              resultOf({
                id: t.id,
                entityType: "transfer",
                module: "INVENTORY",
                title: t.transferNumber,
                subtitle: `${t.sourceWarehouse.name} → ${t.destinationWarehouse.name}`,
                code: t.transferNumber,
                status: t.status,
                route: `/dashboard/inventory/transfers/${t.id}`,
                query: q,
                fields: [
                  { field: "transferNumber", value: t.transferNumber, kind: "code" },
                  { field: "source", value: t.sourceWarehouse.name, kind: "related" },
                  { field: "destination", value: t.destinationWarehouse.name, kind: "related" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );
  }

  if (can(permissions, SALES_PERMISSIONS.READ)) {
    push(
      prisma.customer
        .findMany({
          where: {
            organizationId: orgId,
            isActive: true,
            OR: [
              { code: contains(q) },
              { name: contains(q) },
              { contactName: contains(q) },
              { email: contains(q) },
              { phone: contains(q) },
              { city: contains(q) },
            ],
          },
          select: {
            id: true,
            code: true,
            name: true,
            contactName: true,
            email: true,
            phone: true,
            city: true,
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((c) =>
              resultOf({
                id: c.id,
                entityType: "customer",
                module: "SALES",
                title: c.name,
                subtitle: [c.code, c.city, c.email].filter(Boolean).join(" · "),
                code: c.code,
                route: `/dashboard/sales/customers/${c.id}`,
                query: q,
                fields: [
                  { field: "code", value: c.code, kind: "code" },
                  { field: "name", value: c.name, kind: "title" },
                  { field: "contactName", value: c.contactName, kind: "related" },
                  { field: "email", value: c.email, kind: "related" },
                  { field: "phone", value: c.phone, kind: "related" },
                  { field: "city", value: c.city, kind: "related" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );

    push(
      prisma.salesOrder
        .findMany({
          where: {
            organizationId: orgId,
            OR: [{ soNumber: contains(q) }, { customer: { name: contains(q) } }],
          },
          select: {
            id: true,
            soNumber: true,
            status: true,
            customer: { select: { name: true } },
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((so) =>
              resultOf({
                id: so.id,
                entityType: "sales_order",
                module: "SALES",
                title: so.soNumber,
                subtitle: so.customer.name,
                code: so.soNumber,
                status: so.status,
                route: `/dashboard/sales/orders/${so.id}`,
                query: q,
                fields: [
                  { field: "soNumber", value: so.soNumber, kind: "code" },
                  { field: "customer", value: so.customer.name, kind: "related" },
                  { field: "status", value: so.status, kind: "status" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );
  }

  if (can(permissions, PROCUREMENT_PERMISSIONS.READ)) {
    push(
      prisma.vendor
        .findMany({
          where: {
            organizationId: orgId,
            isActive: true,
            OR: [
              { code: contains(q) },
              { name: contains(q) },
              { contactName: contains(q) },
              { email: contains(q) },
              { city: contains(q) },
            ],
          },
          select: {
            id: true,
            code: true,
            name: true,
            contactName: true,
            email: true,
            city: true,
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((v) =>
              resultOf({
                id: v.id,
                entityType: "vendor",
                module: "PROCUREMENT",
                title: v.name,
                subtitle: [v.code, v.city].filter(Boolean).join(" · "),
                code: v.code,
                route: `/dashboard/procurement/vendors/${v.id}`,
                query: q,
                fields: [
                  { field: "code", value: v.code, kind: "code" },
                  { field: "name", value: v.name, kind: "title" },
                  { field: "contactName", value: v.contactName, kind: "related" },
                  { field: "email", value: v.email, kind: "related" },
                  { field: "city", value: v.city, kind: "related" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );

    push(
      prisma.purchaseOrder
        .findMany({
          where: {
            organizationId: orgId,
            OR: [{ poNumber: contains(q) }, { vendor: { name: contains(q) } }],
          },
          select: {
            id: true,
            poNumber: true,
            status: true,
            vendor: { select: { name: true } },
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((po) =>
              resultOf({
                id: po.id,
                entityType: "purchase_order",
                module: "PROCUREMENT",
                title: po.poNumber,
                subtitle: po.vendor.name,
                code: po.poNumber,
                status: po.status,
                route: `/dashboard/procurement/purchase-orders/${po.id}`,
                query: q,
                fields: [
                  { field: "poNumber", value: po.poNumber, kind: "code" },
                  { field: "vendor", value: po.vendor.name, kind: "related" },
                  { field: "status", value: po.status, kind: "status" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );
  }

  if (
    can(
      permissions,
      OPERATIONS_PERMISSIONS.READ,
      PROCUREMENT_PERMISSIONS.READ,
      SALES_PERMISSIONS.READ
    )
  ) {
    push(
      prisma.goodsReceipt
        .findMany({
          where: {
            organizationId: orgId,
            OR: [
              { receiptNumber: contains(q) },
              { purchaseOrder: { poNumber: contains(q) } },
              { warehouse: { name: contains(q) } },
            ],
          },
          select: {
            id: true,
            receiptNumber: true,
            status: true,
            purchaseOrder: { select: { poNumber: true } },
            warehouse: { select: { name: true } },
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((gr) =>
              resultOf({
                id: gr.id,
                entityType: "goods_receipt",
                module: "OPERATIONS",
                title: gr.receiptNumber,
                subtitle: [gr.purchaseOrder.poNumber, gr.warehouse.name].join(" · "),
                code: gr.receiptNumber,
                status: gr.status,
                route: `/dashboard/operations/goods-receipts/${gr.id}`,
                query: q,
                fields: [
                  { field: "receiptNumber", value: gr.receiptNumber, kind: "code" },
                  { field: "poNumber", value: gr.purchaseOrder.poNumber, kind: "related" },
                  { field: "warehouse", value: gr.warehouse.name, kind: "related" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );

    push(
      prisma.delivery
        .findMany({
          where: {
            organizationId: orgId,
            OR: [
              { deliveryNumber: contains(q) },
              { salesOrder: { soNumber: contains(q) } },
              { warehouse: { name: contains(q) } },
            ],
          },
          select: {
            id: true,
            deliveryNumber: true,
            status: true,
            salesOrder: { select: { soNumber: true } },
            warehouse: { select: { name: true } },
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((d) =>
              resultOf({
                id: d.id,
                entityType: "delivery",
                module: "OPERATIONS",
                title: d.deliveryNumber,
                subtitle: [d.salesOrder.soNumber, d.warehouse.name].join(" · "),
                code: d.deliveryNumber,
                status: d.status,
                route: `/dashboard/operations/deliveries/${d.id}`,
                query: q,
                fields: [
                  { field: "deliveryNumber", value: d.deliveryNumber, kind: "code" },
                  { field: "soNumber", value: d.salesOrder.soNumber, kind: "related" },
                  { field: "warehouse", value: d.warehouse.name, kind: "related" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );
  }

  if (can(permissions, FINANCE_PERMISSIONS.READ, ACCOUNTING_PERMISSIONS.READ)) {
    push(
      prisma.customerInvoice
        .findMany({
          where: {
            organizationId: orgId,
            OR: [
              { invoiceNumber: contains(q) },
              { customer: { name: contains(q) } },
            ],
          },
          select: {
            id: true,
            invoiceNumber: true,
            status: true,
            customer: { select: { name: true } },
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((inv) =>
              resultOf({
                id: inv.id,
                entityType: "customer_invoice",
                module: "FINANCE",
                title: inv.invoiceNumber,
                subtitle: inv.customer.name,
                code: inv.invoiceNumber,
                status: inv.status,
                route: `/dashboard/finance/customer-invoices/${inv.id}`,
                query: q,
                fields: [
                  { field: "invoiceNumber", value: inv.invoiceNumber, kind: "code" },
                  { field: "customer", value: inv.customer.name, kind: "related" },
                  { field: "status", value: inv.status, kind: "status" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );

    push(
      prisma.vendorBill
        .findMany({
          where: {
            organizationId: orgId,
            OR: [{ billNumber: contains(q) }, { vendor: { name: contains(q) } }],
          },
          select: {
            id: true,
            billNumber: true,
            status: true,
            vendor: { select: { name: true } },
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((bill) =>
              resultOf({
                id: bill.id,
                entityType: "vendor_bill",
                module: "FINANCE",
                title: bill.billNumber,
                subtitle: bill.vendor.name,
                code: bill.billNumber,
                status: bill.status,
                route: `/dashboard/finance/vendor-bills/${bill.id}`,
                query: q,
                fields: [
                  { field: "billNumber", value: bill.billNumber, kind: "code" },
                  { field: "vendor", value: bill.vendor.name, kind: "related" },
                  { field: "status", value: bill.status, kind: "status" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );

    push(
      prisma.customerPayment
        .findMany({
          where: {
            organizationId: orgId,
            OR: [
              { paymentNumber: contains(q) },
              { reference: contains(q) },
              { customer: { name: contains(q) } },
            ],
          },
          select: {
            id: true,
            paymentNumber: true,
            reference: true,
            customer: { select: { name: true } },
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((p) =>
              resultOf({
                id: p.id,
                entityType: "customer_payment",
                module: "FINANCE",
                title: p.paymentNumber,
                subtitle: p.customer.name,
                code: p.paymentNumber,
                route: `/dashboard/finance/customer-payments/${p.id}`,
                query: q,
                fields: [
                  { field: "paymentNumber", value: p.paymentNumber, kind: "code" },
                  { field: "reference", value: p.reference, kind: "related" },
                  { field: "customer", value: p.customer.name, kind: "related" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );

    push(
      prisma.vendorPayment
        .findMany({
          where: {
            organizationId: orgId,
            OR: [
              { paymentNumber: contains(q) },
              { reference: contains(q) },
              { vendor: { name: contains(q) } },
            ],
          },
          select: {
            id: true,
            paymentNumber: true,
            reference: true,
            vendor: { select: { name: true } },
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((p) =>
              resultOf({
                id: p.id,
                entityType: "vendor_payment",
                module: "FINANCE",
                title: p.paymentNumber,
                subtitle: p.vendor.name,
                code: p.paymentNumber,
                route: `/dashboard/finance/vendor-payments/${p.id}`,
                query: q,
                fields: [
                  { field: "paymentNumber", value: p.paymentNumber, kind: "code" },
                  { field: "reference", value: p.reference, kind: "related" },
                  { field: "vendor", value: p.vendor.name, kind: "related" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );
  }

  if (can(permissions, ACCOUNTING_PERMISSIONS.READ)) {
    push(
      prisma.account
        .findMany({
          where: {
            organizationId: orgId,
            AND: [
              { OR: [{ isActive: true }, { isProtected: true }] },
              { OR: [{ code: contains(q) }, { name: contains(q) }] },
            ],
          },
          select: { id: true, code: true, name: true, isProtected: true },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((account) =>
              resultOf({
                id: account.id,
                entityType: "account",
                module: "ACCOUNTING",
                title: account.name,
                subtitle: account.code,
                code: account.code,
                route: `/dashboard/accounting/chart-of-accounts/${account.id}`,
                query: q,
                metadata: account.isProtected ? { lifecycle: "Protected" } : undefined,
                fields: [
                  { field: "code", value: account.code, kind: "code" },
                  { field: "name", value: account.name, kind: "title" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );

    push(
      prisma.journalEntry
        .findMany({
          where: {
            organizationId: orgId,
            OR: [
              { entryNumber: contains(q) },
              { description: contains(q) },
              { sourceReference: contains(q) },
            ],
          },
          select: {
            id: true,
            entryNumber: true,
            description: true,
            status: true,
            sourceReference: true,
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((je) =>
              resultOf({
                id: je.id,
                entityType: "journal_entry",
                module: "ACCOUNTING",
                title: je.entryNumber,
                subtitle: je.description,
                code: je.entryNumber,
                status: je.status,
                route: `/dashboard/accounting/journal-entries/${je.id}`,
                query: q,
                fields: [
                  { field: "entryNumber", value: je.entryNumber, kind: "code" },
                  { field: "description", value: je.description, kind: "body" },
                  { field: "sourceReference", value: je.sourceReference, kind: "related" },
                  { field: "status", value: je.status, kind: "status" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );
  }

  if (can(permissions, HR_PERMISSIONS.READ)) {
    push(
      prisma.employee
        .findMany({
          where: {
            organizationId: orgId,
            isActive: true,
            OR: [
              { employeeNumber: contains(q) },
              { firstName: contains(q) },
              { lastName: contains(q) },
              { email: contains(q) },
              { phone: contains(q) },
              { workLocation: contains(q) },
            ],
          },
          select: {
            id: true,
            employeeNumber: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            workLocation: true,
            employmentStatus: true,
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((e) => {
              const name = `${e.firstName} ${e.lastName}`.trim();
              return resultOf({
                id: e.id,
                entityType: "employee",
                module: "HR",
                title: name,
                subtitle: [e.employeeNumber, e.email].filter(Boolean).join(" · "),
                code: e.employeeNumber,
                status: e.employmentStatus,
                route: `/dashboard/hr/employees/${e.id}`,
                query: q,
                fields: [
                  { field: "employeeNumber", value: e.employeeNumber, kind: "code" },
                  { field: "name", value: name, kind: "title" },
                  { field: "email", value: e.email, kind: "related" },
                  { field: "phone", value: e.phone, kind: "related" },
                  { field: "workLocation", value: e.workLocation, kind: "related" },
                ],
              });
            })
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );

    push(
      prisma.department
        .findMany({
          where: {
            organizationId: orgId,
            isActive: true,
            OR: [{ code: contains(q) }, { name: contains(q) }],
          },
          select: { id: true, code: true, name: true },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((d) =>
              resultOf({
                id: d.id,
                entityType: "department",
                module: "HR",
                title: d.name,
                subtitle: d.code,
                code: d.code,
                route: `/dashboard/hr/departments`,
                query: q,
                fields: [
                  { field: "code", value: d.code, kind: "code" },
                  { field: "name", value: d.name, kind: "title" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );

    push(
      prisma.position
        .findMany({
          where: {
            organizationId: orgId,
            isActive: true,
            OR: [{ title: contains(q) }, { level: contains(q) }, { department: { name: contains(q) } }],
          },
          select: {
            id: true,
            title: true,
            level: true,
            department: { select: { name: true } },
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((p) =>
              resultOf({
                id: p.id,
                entityType: "position",
                module: "HR",
                title: p.title,
                subtitle: [p.level, p.department.name].filter(Boolean).join(" · "),
                route: `/dashboard/hr/positions/${p.id}`,
                query: q,
                fields: [
                  { field: "title", value: p.title, kind: "title" },
                  { field: "level", value: p.level, kind: "related" },
                  { field: "department", value: p.department.name, kind: "related" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );

    push(
      prisma.payrollRun
        .findMany({
          where: {
            organizationId: orgId,
            OR: [{ runNumber: contains(q) }, { notes: contains(q) }],
          },
          select: { id: true, runNumber: true, status: true, notes: true },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((run) =>
              resultOf({
                id: run.id,
                entityType: "payroll_run",
                module: "HR",
                title: run.runNumber,
                subtitle: run.status,
                code: run.runNumber,
                status: run.status,
                route: `/dashboard/hr/payroll/${run.id}`,
                query: q,
                fields: [
                  { field: "runNumber", value: run.runNumber, kind: "code" },
                  { field: "notes", value: run.notes, kind: "body" },
                  { field: "status", value: run.status, kind: "status" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );

    push(
      prisma.leaveRequest
        .findMany({
          where: {
            organizationId: orgId,
            OR: [
              { reason: contains(q) },
              {
                employee: {
                  OR: [
                    { firstName: contains(q) },
                    { lastName: contains(q) },
                    { employeeNumber: contains(q) },
                  ],
                },
              },
            ],
          },
          select: {
            id: true,
            type: true,
            status: true,
            reason: true,
            employee: {
              select: { firstName: true, lastName: true, employeeNumber: true },
            },
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((lr) => {
              const empName = `${lr.employee.firstName} ${lr.employee.lastName}`.trim();
              return resultOf({
                id: lr.id,
                entityType: "leave_request",
                module: "HR",
                title: `${lr.type} — ${empName}`,
                subtitle: [lr.employee.employeeNumber, lr.status].join(" · "),
                status: lr.status,
                route: `/dashboard/hr/leave-requests/${lr.id}`,
                query: q,
                fields: [
                  { field: "type", value: lr.type, kind: "title" },
                  { field: "employee", value: empName, kind: "related" },
                  { field: "employeeNumber", value: lr.employee.employeeNumber, kind: "code" },
                  { field: "reason", value: lr.reason, kind: "body" },
                  { field: "status", value: lr.status, kind: "status" },
                ],
              });
            })
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );
  }

  if (can(permissions, PROJECTS_PERMISSIONS.READ)) {
    push(
      prisma.project
        .findMany({
          where: {
            organizationId: orgId,
            OR: [{ code: contains(q) }, { name: contains(q) }, { notes: contains(q) }],
          },
          select: { id: true, code: true, name: true, status: true, notes: true },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((p) =>
              resultOf({
                id: p.id,
                entityType: "project",
                module: "PROJECTS",
                title: p.name,
                subtitle: p.code,
                code: p.code,
                status: p.status,
                route: `/dashboard/projects/${p.id}`,
                query: q,
                fields: [
                  { field: "code", value: p.code, kind: "code" },
                  { field: "name", value: p.name, kind: "title" },
                  { field: "notes", value: p.notes, kind: "body" },
                  { field: "status", value: p.status, kind: "status" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );

    push(
      prisma.projectTask
        .findMany({
          where: {
            organizationId: orgId,
            OR: [
              { title: contains(q) },
              { description: contains(q) },
              { project: { name: contains(q) } },
              { project: { code: contains(q) } },
            ],
          },
          select: {
            id: true,
            title: true,
            status: true,
            description: true,
            project: { select: { id: true, name: true, code: true } },
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((task) =>
              resultOf({
                id: task.id,
                entityType: "project_task",
                module: "PROJECTS",
                title: task.title,
                subtitle: [task.project.code, task.project.name].join(" · "),
                status: task.status,
                route: `/dashboard/projects/tasks/${task.id}`,
                query: q,
                fields: [
                  { field: "title", value: task.title, kind: "title" },
                  { field: "project", value: task.project.name, kind: "related" },
                  { field: "projectCode", value: task.project.code, kind: "code" },
                  { field: "description", value: task.description, kind: "body" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );
  }

  if (can(permissions, SUPPORT_PERMISSIONS.READ)) {
    push(
      prisma.supportTicket
        .findMany({
          where: {
            organizationId: orgId,
            OR: [
              { ticketNumber: contains(q) },
              { title: contains(q) },
              { description: contains(q) },
            ],
          },
          select: {
            id: true,
            ticketNumber: true,
            title: true,
            description: true,
            status: true,
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((t) =>
              resultOf({
                id: t.id,
                entityType: "support_ticket",
                module: "SUPPORT",
                title: t.title,
                subtitle: t.ticketNumber,
                code: t.ticketNumber,
                status: t.status,
                route: `/dashboard/support/tickets/${t.id}`,
                query: q,
                fields: [
                  { field: "ticketNumber", value: t.ticketNumber, kind: "code" },
                  { field: "title", value: t.title, kind: "title" },
                  { field: "description", value: t.description, kind: "body" },
                  { field: "status", value: t.status, kind: "status" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );
  }

  if (can(permissions, DOCUMENTS_PERMISSIONS.READ)) {
    push(
      prisma.documentFile
        .findMany({
          where: {
            organizationId: orgId,
            status: { not: "ARCHIVED" },
            OR: [
              { fileNumber: contains(q) },
              { title: contains(q) },
              { fileName: contains(q) },
            ],
          },
          select: {
            id: true,
            fileNumber: true,
            title: true,
            fileName: true,
            status: true,
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((d) =>
              resultOf({
                id: d.id,
                entityType: "document",
                module: "DOCUMENTS",
                title: d.title,
                subtitle: d.fileNumber,
                code: d.fileNumber,
                status: d.status,
                route: `/dashboard/documents/files/${d.id}`,
                query: q,
                fields: [
                  { field: "fileNumber", value: d.fileNumber, kind: "code" },
                  { field: "title", value: d.title, kind: "title" },
                  { field: "fileName", value: d.fileName, kind: "related" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );
  }

  if (can(permissions, KNOWLEDGE_PERMISSIONS.READ)) {
    push(
      prisma.knowledgeArticle
        .findMany({
          where: {
            organizationId: orgId,
            status: { not: "ARCHIVED" },
            OR: [
              { articleNumber: contains(q) },
              { title: contains(q) },
              { summary: contains(q) },
            ],
          },
          select: {
            id: true,
            articleNumber: true,
            title: true,
            summary: true,
            status: true,
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((a) =>
              resultOf({
                id: a.id,
                entityType: "knowledge_article",
                module: "KNOWLEDGE",
                title: a.title,
                subtitle: a.articleNumber,
                code: a.articleNumber,
                status: a.status,
                route: `/dashboard/knowledge/articles/${a.id}`,
                query: q,
                fields: [
                  { field: "articleNumber", value: a.articleNumber, kind: "code" },
                  { field: "title", value: a.title, kind: "title" },
                  { field: "summary", value: a.summary, kind: "body" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );
  }

  if (can(permissions, CRM_PERMISSIONS.READ)) {
    push(
      prisma.lead
        .findMany({
          where: {
            organizationId: orgId,
            OR: [
              { leadNumber: contains(q) },
              { companyName: contains(q) },
              { contactName: contains(q) },
              { email: contains(q) },
              { phone: contains(q) },
              { city: contains(q) },
            ],
          },
          select: {
            id: true,
            leadNumber: true,
            companyName: true,
            contactName: true,
            email: true,
            phone: true,
            city: true,
            status: true,
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((l) =>
              resultOf({
                id: l.id,
                entityType: "lead",
                module: "CRM",
                title: l.companyName,
                subtitle: [l.leadNumber, l.contactName].filter(Boolean).join(" · "),
                code: l.leadNumber,
                status: l.status,
                route: `/dashboard/crm/leads/${l.id}`,
                query: q,
                fields: [
                  { field: "leadNumber", value: l.leadNumber, kind: "code" },
                  { field: "companyName", value: l.companyName, kind: "title" },
                  { field: "contactName", value: l.contactName, kind: "related" },
                  { field: "email", value: l.email, kind: "related" },
                  { field: "phone", value: l.phone, kind: "related" },
                  { field: "city", value: l.city, kind: "related" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );

    push(
      prisma.opportunity
        .findMany({
          where: {
            organizationId: orgId,
            OR: [
              { opportunityNumber: contains(q) },
              { title: contains(q) },
              { notes: contains(q) },
            ],
          },
          select: {
            id: true,
            opportunityNumber: true,
            title: true,
            notes: true,
            stage: true,
          },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((o) =>
              resultOf({
                id: o.id,
                entityType: "opportunity",
                module: "CRM",
                title: o.title,
                subtitle: o.opportunityNumber,
                code: o.opportunityNumber,
                status: o.stage,
                route: `/dashboard/crm/opportunities/${o.id}`,
                query: q,
                fields: [
                  { field: "opportunityNumber", value: o.opportunityNumber, kind: "code" },
                  { field: "title", value: o.title, kind: "title" },
                  { field: "notes", value: o.notes, kind: "body" },
                  { field: "stage", value: o.stage, kind: "status" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );

    push(
      prisma.crmActivity
        .findMany({
          where: {
            organizationId: orgId,
            OR: [{ subject: contains(q) }, { notes: contains(q) }],
          },
          select: { id: true, subject: true, notes: true, type: true },
          take: perType,
        })
        .then((rows) =>
          rows
            .map((a) =>
              resultOf({
                id: a.id,
                entityType: "activity",
                module: "CRM",
                title: a.subject,
                subtitle: a.type,
                status: a.type,
                route: `/dashboard/crm/activities/${a.id}`,
                query: q,
                fields: [
                  { field: "subject", value: a.subject, kind: "title" },
                  { field: "notes", value: a.notes, kind: "body" },
                  { field: "type", value: a.type, kind: "status" },
                ],
              })
            )
            .filter((r): r is GlobalSearchResult => r != null)
        )
    );
  }

  const batches = await Promise.all(tasks);
  const results = batches
    .flat()
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);

  const grouped = groupSearchResults(results, SEARCH_MODULE_LABELS, SEARCH_MODULE_ORDER);

  return {
    query: q,
    results,
    grouped,
    truncated: batches.flat().length > results.length,
  };
}
