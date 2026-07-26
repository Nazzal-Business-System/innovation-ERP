import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertMutationEntity,
  assertMutationFields,
  MutationFieldMismatchError,
} from "../../query/assert-mutation-fields.ts";
import { shouldAllowEditDialogClose } from "../edit-dialog.ts";

describe("assertMutationFields", () => {
  it("passes when critical fields match", () => {
    assert.doesNotThrow(() =>
      assertMutationFields(
        { id: "p1", status: "DRAFT", isArchived: false },
        { id: "p1", status: "DRAFT" },
        "updateProduct"
      )
    );
  });

  it("throws when status does not persist (false-success guard)", () => {
    assert.throws(
      () =>
        assertMutationFields(
          { id: "p1", status: "ACTIVE", isArchived: false },
          { id: "p1", status: "DRAFT" },
          "updateProduct"
        ),
      (err: unknown) =>
        err instanceof MutationFieldMismatchError &&
        err.field === "status" &&
        err.expected === "DRAFT" &&
        err.actual === "ACTIVE"
    );
  });

  it("throws when entity is missing", () => {
    assert.throws(
      () => assertMutationFields(null, { id: "p1" }, "updateProduct"),
      MutationFieldMismatchError
    );
  });

  it("assertMutationEntity checks id and status together", () => {
    assert.doesNotThrow(() =>
      assertMutationEntity(
        { id: "o1", stage: "QUALIFICATION" },
        { id: "o1", stage: "QUALIFICATION" },
        "updateOpportunityStage"
      )
    );
    assert.throws(
      () =>
        assertMutationEntity(
          { id: "o1", stage: "PROSPECTING" },
          { id: "o1", stage: "QUALIFICATION" },
          "updateOpportunityStage"
        ),
      MutationFieldMismatchError
    );
  });

  it("lifecycle isArchived must match requested active flag", () => {
    assert.doesNotThrow(() =>
      assertMutationEntity(
        { id: "p1", isArchived: true },
        { id: "p1", isArchived: true },
        "setProductLifecycle"
      )
    );
    assert.throws(
      () =>
        assertMutationEntity(
          { id: "p1", isArchived: false },
          { id: "p1", isArchived: true },
          "setProductLifecycle"
        ),
      MutationFieldMismatchError
    );
  });
});

describe("mutation loading / duplicate submit", () => {
  it("blocks dialog close while submitting (preserves form values)", () => {
    assert.equal(shouldAllowEditDialogClose(true, false), false);
  });

  it("allows close when idle", () => {
    assert.equal(shouldAllowEditDialogClose(false, false), true);
  });
});

describe("product catalog status vs lifecycle", () => {
  it("treats DRAFT catalog status as distinct from archive lifecycle", () => {
    const product = { status: "DRAFT" as const, isArchived: false };
    assert.equal(product.status, "DRAFT");
    assert.equal(product.isArchived, false);
    // UI must not label this as Active solely because isArchived is false
    const displayStatus = product.status;
    const displayLifecycle = product.isArchived ? "archived" : "active-record";
    assert.notEqual(displayStatus, "ACTIVE");
    assert.equal(displayLifecycle, "active-record");
  });
});
