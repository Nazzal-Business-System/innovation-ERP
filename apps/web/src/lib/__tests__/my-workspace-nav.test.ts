import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractAuditBusinessCode,
  formatAuditActionLabel,
  formatAuditDetailSummary,
  formatAuditEntityLabel,
  isEmployeeSelfServiceUser,
  isUuidLike,
} from "@ierp/shared";
import { canAccessNavItem } from "../nav-permissions.ts";

describe("isEmployeeSelfServiceUser", () => {
  it("allows hr_self without management permissions", () => {
    assert.equal(isEmployeeSelfServiceUser(["hr_self.read", "notifications.read"]), true);
  });

  it("denies CEO/owner with executive + hr_self", () => {
    assert.equal(
      isEmployeeSelfServiceUser(["hr_self.read", "executive.read", "hr.read"]),
      false
    );
  });

  it("denies HR manager with hr.read", () => {
    assert.equal(isEmployeeSelfServiceUser(["hr_self.read", "hr.read"]), false);
  });
});

describe("canAccessNavItem My Workspace", () => {
  it("shows my-* only for employee self-service users", () => {
    assert.equal(canAccessNavItem("my-overview", ["hr_self.read"]), true);
    assert.equal(canAccessNavItem("my-leave", ["hr_self.read", "notifications.read"]), true);
  });

  it("hides my-* for CEO/owner with executive access", () => {
    assert.equal(
      canAccessNavItem("my-overview", ["hr_self.read", "executive.read", "hr.read"]),
      false
    );
  });

  it("hides my-* for managers without hr_self", () => {
    assert.equal(canAccessNavItem("my-overview", ["sales.read", "executive.read"]), false);
  });
});

describe("audit action labels", () => {
  it("maps known actions to sentence-case English", () => {
    assert.equal(formatAuditActionLabel("auth.login", "en"), "Signed in");
    assert.equal(
      formatAuditActionLabel("procurement.purchase_order.approved", "en"),
      "Approved purchase order"
    );
    assert.equal(formatAuditActionLabel("sales.order.confirmed", "en"), "Confirmed sales order");
  });

  it("provides Arabic labels for known actions", () => {
    assert.equal(formatAuditActionLabel("auth.logout", "ar"), "تسجيل الخروج");
  });

  it("never returns raw dotted code as primary for unknown actions", () => {
    const label = formatAuditActionLabel("custom.module.thing_done", "en");
    assert.equal(label.includes("."), false);
    assert.match(label, /[A-Z]/);
  });

  it("formats entity CamelCase to words", () => {
    assert.equal(formatAuditEntityLabel("PurchaseOrder", "en"), "Purchase order");
    assert.equal(formatAuditEntityLabel("SalesOrder", "en"), "Sales order");
  });

  it("prefers business codes over UUIDs", () => {
    assert.equal(
      extractAuditBusinessCode({ purchaseOrderNumber: "PO-2026-0012" }),
      "PO-2026-0012"
    );
    assert.equal(
      extractAuditBusinessCode({ id: "00000000-0000-4000-8000-000000000099" }),
      null
    );
    assert.equal(isUuidLike("00000000-0000-4000-8000-000000000099"), true);
  });

  it("builds readable detail summary", () => {
    const summary = formatAuditDetailSummary({
      action: "procurement.purchase_order.approved",
      userName: "Finance Manager",
      details: { purchaseOrderNumber: "PO-2026-0012" },
      locale: "en",
    });
    assert.match(summary, /Finance Manager/);
    assert.match(summary, /PO-2026-0012/);
    assert.match(summary, /Approved purchase order/);
  });
});
