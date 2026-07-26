import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { updateProductSchema } from "../inventory-validation.ts";

describe("updateProductSchema status persistence contract", () => {
  it("accepts DRAFT catalog status (not lifecycle)", () => {
    const parsed = updateProductSchema.safeParse({ status: "DRAFT" });
    assert.equal(parsed.success, true);
    if (parsed.success) {
      assert.equal(parsed.data.status, "DRAFT");
      assert.equal("isArchived" in parsed.data, false);
      assert.equal("active" in parsed.data, false);
    }
  });

  it("accepts ACTIVE and DISCONTINUED", () => {
    for (const status of ["ACTIVE", "DISCONTINUED"] as const) {
      const parsed = updateProductSchema.safeParse({ status });
      assert.equal(parsed.success, true);
      if (parsed.success) assert.equal(parsed.data.status, status);
    }
  });

  it("rejects invalid status values", () => {
    const parsed = updateProductSchema.safeParse({ status: "archived" });
    assert.equal(parsed.success, false);
  });

  it("rejects empty patch body", () => {
    const parsed = updateProductSchema.safeParse({});
    assert.equal(parsed.success, false);
  });
});
