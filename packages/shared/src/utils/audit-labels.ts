/**
 * Audit action / entity label registry — keep raw codes in API/DB;
 * present sentence-case EN/AR labels in the UI.
 */

export type AuditLocale = "en" | "ar";

export interface AuditActionLabel {
  en: string;
  ar: string;
}

/** Known action codes → friendly labels (sentence case). */
export const AUDIT_ACTION_LABELS: Record<string, AuditActionLabel> = {
  "auth.login": { en: "Signed in", ar: "تسجيل الدخول" },
  "auth.logout": { en: "Signed out", ar: "تسجيل الخروج" },
  "auth.avatar_updated": { en: "Updated profile photo", ar: "تحديث صورة الملف الشخصي" },
  "auth.avatar_removed": { en: "Removed profile photo", ar: "إزالة صورة الملف الشخصي" },
  "auth.profile_updated": { en: "Updated profile", ar: "تحديث الملف الشخصي" },
  "auth.password_changed": { en: "Changed password", ar: "تغيير كلمة المرور" },
  "auth.preferences_updated": { en: "Updated preferences", ar: "تحديث التفضيلات" },

  "procurement.purchase_order.created": { en: "Created purchase order", ar: "إنشاء أمر شراء" },
  "procurement.purchase_order.updated": { en: "Updated purchase order", ar: "تحديث أمر شراء" },
  "procurement.purchase_order.approved": { en: "Approved purchase order", ar: "اعتماد أمر شراء" },
  "procurement.purchase_order.sent": { en: "Sent purchase order", ar: "إرسال أمر شراء" },
  "procurement.purchase_order.cancelled": { en: "Cancelled purchase order", ar: "إلغاء أمر شراء" },
  "procurement.vendor.created": { en: "Created vendor", ar: "إنشاء مورد" },
  "procurement.vendor.updated": { en: "Updated vendor", ar: "تحديث مورد" },

  "sales.order.created": { en: "Created sales order", ar: "إنشاء أمر بيع" },
  "sales.order.updated": { en: "Updated sales order", ar: "تحديث أمر بيع" },
  "sales.order.confirmed": { en: "Confirmed sales order", ar: "تأكيد أمر بيع" },
  "sales.order.cancelled": { en: "Cancelled sales order", ar: "إلغاء أمر بيع" },
  "sales.customer.created": { en: "Created customer", ar: "إنشاء عميل" },
  "sales.customer.updated": { en: "Updated customer", ar: "تحديث عميل" },

  "accounting.journal_entry.created": { en: "Created journal entry", ar: "إنشاء قيد يومية" },
  "accounting.journal_entry.posted": { en: "Posted journal entry", ar: "ترحيل قيد يومية" },
  "accounting.journal_entry.voided": { en: "Voided journal entry", ar: "إلغاء قيد يومية" },
  "accounting.account.created": { en: "Created account", ar: "إنشاء حساب" },
  "accounting.account.updated": { en: "Updated account", ar: "تحديث حساب" },

  "finance.invoice.created": { en: "Created customer invoice", ar: "إنشاء فاتورة عميل" },
  "finance.invoice.sent": { en: "Sent customer invoice", ar: "إرسال فاتورة عميل" },
  "finance.invoice.voided": { en: "Voided customer invoice", ar: "إلغاء فاتورة عميل" },
  "finance.customer_payment.created": { en: "Recorded customer payment", ar: "تسجيل دفعة عميل" },
  "finance.vendor_bill.created": { en: "Created vendor bill", ar: "إنشاء فاتورة مورد" },
  "finance.vendor_bill.received": { en: "Received vendor bill", ar: "استلام فاتورة مورد" },
  "finance.vendor_payment.created": { en: "Recorded vendor payment", ar: "تسجيل دفعة مورد" },

  "inventory.product.created": { en: "Created product", ar: "إنشاء منتج" },
  "inventory.product.updated": { en: "Updated product", ar: "تحديث منتج" },
  "inventory.transfer.created": { en: "Created stock transfer", ar: "إنشاء تحويل مخزون" },
  "inventory.transfer.completed": { en: "Completed stock transfer", ar: "إكمال تحويل مخزون" },
  "inventory.reservation.created": { en: "Created stock reservation", ar: "إنشاء حجز مخزون" },

  "operations.goods_receipt.created": { en: "Created goods receipt", ar: "إنشاء سند استلام" },
  "operations.goods_receipt.posted": { en: "Posted goods receipt", ar: "ترحيل سند استلام" },
  "operations.delivery.created": { en: "Created delivery", ar: "إنشاء تسليم" },
  "operations.delivery.posted": { en: "Posted delivery", ar: "ترحيل تسليم" },

  "hr.leave.created": { en: "Created leave request", ar: "إنشاء طلب إجازة" },
  "hr.leave.approved": { en: "Approved leave request", ar: "اعتماد طلب إجازة" },
  "hr.leave.rejected": { en: "Rejected leave request", ar: "رفض طلب إجازة" },
  "hr.leave.cancelled": { en: "Cancelled leave request", ar: "إلغاء طلب إجازة" },
  "hr.attendance.check_in": { en: "Checked in", ar: "تسجيل حضور" },
  "hr.attendance.check_out": { en: "Checked out", ar: "تسجيل انصراف" },
  "hr.payroll.processed": { en: "Processed payroll", ar: "معالجة الرواتب" },
  "hr.payroll.paid": { en: "Paid payroll", ar: "صرف الرواتب" },
  "hr.employee.created": { en: "Created employee", ar: "إنشاء موظف" },
  "hr.employee.updated": { en: "Updated employee", ar: "تحديث موظف" },

  "crm.lead.created": { en: "Created lead", ar: "إنشاء عميل محتمل" },
  "crm.lead.updated": { en: "Updated lead", ar: "تحديث عميل محتمل" },
  "crm.opportunity.created": { en: "Created opportunity", ar: "إنشاء فرصة" },
  "crm.opportunity.updated": { en: "Updated opportunity", ar: "تحديث فرصة" },

  "projects.project.created": { en: "Created project", ar: "إنشاء مشروع" },
  "projects.task.updated": { en: "Updated task", ar: "تحديث مهمة" },

  "support.ticket.created": { en: "Created support ticket", ar: "إنشاء تذكرة دعم" },
  "support.ticket.updated": { en: "Updated support ticket", ar: "تحديث تذكرة دعم" },

  "documents.file.created": { en: "Uploaded document", ar: "رفع مستند" },
  "documents.file.updated": { en: "Updated document", ar: "تحديث مستند" },

  "knowledge.article.created": { en: "Created knowledge article", ar: "إنشاء مقال معرفة" },
  "knowledge.article.published": { en: "Published knowledge article", ar: "نشر مقال معرفة" },
  "knowledge.article.updated": { en: "Updated knowledge article", ar: "تحديث مقال معرفة" },

  "settings.organization.updated": { en: "Updated organization", ar: "تحديث المؤسسة" },
  "settings.roles.permissions.updated": { en: "Updated role permissions", ar: "تحديث صلاحيات الدور" },
  "settings.preferences.updated": { en: "Updated system preferences", ar: "تحديث تفضيلات النظام" },

  "reports.generated": { en: "Generated report", ar: "إنشاء تقرير" },
  "seed.completed": { en: "Completed data seed", ar: "اكتمال تهيئة البيانات" },
};

/** Prisma / domain entity names → friendly labels. */
export const AUDIT_ENTITY_LABELS: Record<string, AuditActionLabel> = {
  User: { en: "User", ar: "مستخدم" },
  Organization: { en: "Organization", ar: "مؤسسة" },
  PurchaseOrder: { en: "Purchase order", ar: "أمر شراء" },
  SalesOrder: { en: "Sales order", ar: "أمر بيع" },
  JournalEntry: { en: "Journal entry", ar: "قيد يومية" },
  LeaveRequest: { en: "Leave request", ar: "طلب إجازة" },
  Report: { en: "Report", ar: "تقرير" },
  Role: { en: "Role", ar: "دور" },
  SystemPreference: { en: "System preference", ar: "تفضيل نظام" },
  Customer: { en: "Customer", ar: "عميل" },
  Vendor: { en: "Vendor", ar: "مورد" },
  Product: { en: "Product", ar: "منتج" },
  Employee: { en: "Employee", ar: "موظف" },
  CustomerInvoice: { en: "Customer invoice", ar: "فاتورة عميل" },
  VendorBill: { en: "Vendor bill", ar: "فاتورة مورد" },
  GoodsReceipt: { en: "Goods receipt", ar: "سند استلام" },
  Delivery: { en: "Delivery", ar: "تسليم" },
  StockTransfer: { en: "Stock transfer", ar: "تحويل مخزون" },
  KnowledgeArticle: { en: "Knowledge article", ar: "مقال معرفة" },
  SupportTicket: { en: "Support ticket", ar: "تذكرة دعم" },
  DocumentFile: { en: "Document", ar: "مستند" },
  Project: { en: "Project", ar: "مشروع" },
  Task: { en: "Task", ar: "مهمة" },
  PayrollRun: { en: "Payroll run", ar: "مسير رواتب" },
  Lead: { en: "Lead", ar: "عميل محتمل" },
  Opportunity: { en: "Opportunity", ar: "فرصة" },
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function titleFromSegments(action: string, locale: AuditLocale): string {
  const parts = action.split(".").filter(Boolean);
  if (parts.length === 0) {
    return locale === "ar" ? "نشاط غير معروف" : "Unknown activity";
  }
  const last = parts[parts.length - 1]!.replace(/_/g, " ");
  const mid = parts.length > 2 ? parts[parts.length - 2]!.replace(/_/g, " ") : "";
  const en = mid ? `${last} ${mid}` : last;
  // Sentence case without inventing domain meaning
  const sentence = en.charAt(0).toUpperCase() + en.slice(1).toLowerCase();
  return locale === "ar" ? `نشاط: ${sentence}` : sentence;
}

/** Friendly action label; never returns raw snake_case/dot notation as primary. */
export function formatAuditActionLabel(
  action: string,
  locale: AuditLocale = "en"
): string {
  const known = AUDIT_ACTION_LABELS[action];
  if (known) return known[locale] || known.en;
  return titleFromSegments(action, locale);
}

export function formatAuditEntityLabel(
  entity: string | null | undefined,
  locale: AuditLocale = "en"
): string {
  if (!entity) return locale === "ar" ? "—" : "—";
  const known = AUDIT_ENTITY_LABELS[entity];
  if (known) return known[locale] || known.en;
  // CamelCase → words
  const spaced = entity.replace(/([a-z])([A-Z])/g, "$1 $2");
  const sentence = spaced.charAt(0).toUpperCase() + spaced.slice(1);
  return locale === "ar" ? sentence : sentence;
}

export interface AuditDetailsReadable {
  businessCode?: string | null;
  summary?: string | null;
}

/** Pull a business number/code from audit details when present. */
export function extractAuditBusinessCode(
  details: Record<string, unknown> | null | undefined
): string | null {
  if (!details) return null;
  const keys = [
    "businessCode",
    "code",
    "number",
    "orderNumber",
    "purchaseOrderNumber",
    "salesOrderNumber",
    "invoiceNumber",
    "billNumber",
    "journalNumber",
    "entryNumber",
    "articleNumber",
    "ticketNumber",
    "employeeNumber",
    "receiptNumber",
    "deliveryNumber",
    "roleCode",
    "poNumber",
    "soNumber",
  ];
  for (const key of keys) {
    const v = details[key];
    if (typeof v === "string" && v.trim() && !UUID_RE.test(v.trim())) {
      return v.trim();
    }
  }
  return null;
}

/**
 * Optional one-line summary for admins, e.g.
 * "Finance Manager approved purchase order PO-2026-0012"
 */
export function formatAuditDetailSummary(input: {
  action: string;
  entity?: string | null;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  userName?: string | null;
  locale?: AuditLocale;
}): string {
  const locale = input.locale ?? "en";
  const actionLabel = formatAuditActionLabel(input.action, locale);
  const code = extractAuditBusinessCode(input.details);
  const who = input.userName?.trim();

  if (locale === "ar") {
    if (who && code) return `${who} — ${actionLabel} (${code})`;
    if (who) return `${who} — ${actionLabel}`;
    if (code) return `${actionLabel} (${code})`;
    return actionLabel;
  }

  if (who && code) return `${who} — ${actionLabel}: ${code}`;
  if (who) return `${who} — ${actionLabel}`;
  if (code) return `${actionLabel}: ${code}`;
  return actionLabel;
}

export function isUuidLike(value: string | null | undefined): boolean {
  return Boolean(value && UUID_RE.test(value));
}
