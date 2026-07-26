import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { searchNavigationCatalog } from "@ierp/shared";

describe("searchNavigationCatalog", () => {
  const resolveLabel = (itemId: string, groupId?: string) => {
    if (groupId) return groupId;
    if (itemId === "hr-payroll") return "Payroll";
    if (itemId === "accounting-trial-balance") return "Trial Balance";
    if (itemId === "reports-inventory") return "Inventory Valuation";
    if (itemId === "hr-leave") return "Leave Requests";
    if (itemId === "inventory-overview") return "Overview";
    if (itemId === "sales-overview") return "Overview";
    return itemId;
  };

  it("finds payroll page", () => {
    const results = searchNavigationCatalog({
      query: "payroll",
      resolveLabel,
      canAccessItem: () => true,
    });
    assert.ok(results.some((r) => r.route.includes("/hr/payroll")));
  });

  it("finds trial balance", () => {
    const results = searchNavigationCatalog({
      query: "trial balance",
      resolveLabel,
      canAccessItem: () => true,
    });
    assert.ok(results.some((r) => r.route.includes("trial-balance")));
  });

  it("finds inventory valuation report", () => {
    const results = searchNavigationCatalog({
      query: "inventory valuation",
      resolveLabel,
      canAccessItem: () => true,
    });
    assert.ok(results.some((r) => r.route.includes("inventory-valuation")));
  });

  it("deduplicates by route", () => {
    const results = searchNavigationCatalog({
      query: "overview",
      resolveLabel,
      canAccessItem: () => true,
    });
    const routes = results.map((r) => r.route);
    assert.equal(routes.length, new Set(routes).size);
  });

  it("respects access filter", () => {
    const results = searchNavigationCatalog({
      query: "payroll",
      resolveLabel,
      canAccessItem: (id) => id !== "hr-payroll",
    });
    assert.equal(results.filter((r) => r.route.includes("/hr/payroll")).length, 0);
  });
});
