import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapTransactionUiError } from "../transaction-errors.ts";
import {
  buildLinearWorkflowSteps,
  statusLabel,
  transactionStatusVariant,
} from "../transaction-status.ts";

describe("mapTransactionUiError", () => {
  it("returns Error message when safe", () => {
    const err = new Error("Available stock is lower than the requested quantity.");
    assert.equal(
      mapTransactionUiError(err, "fallback"),
      "Available stock is lower than the requested quantity."
    );
  });

  it("strips internal-looking messages", () => {
    const err = new Error("PrismaClientKnownRequestError at C:\\Users\\x\\file.ts");
    assert.equal(mapTransactionUiError(err, "fallback"), "fallback");
  });

  it("strips database and Unix path details", () => {
    assert.equal(
      mapTransactionUiError(new Error("SQLSTATE 23505 constraint users_email_key"), "fallback"),
      "fallback"
    );
    assert.equal(
      mapTransactionUiError(new Error("Failure in /app/src/routes/support.ts:42"), "fallback"),
      "fallback"
    );
  });
});

describe("transaction status helpers", () => {
  it("formats status labels", () => {
    assert.equal(statusLabel("PARTIALLY_RECEIVED"), "PARTIALLY RECEIVED");
  });

  it("maps variants", () => {
    assert.equal(transactionStatusVariant("DRAFT"), "secondary");
    assert.equal(transactionStatusVariant("CONFIRMED"), "info");
    assert.equal(transactionStatusVariant("DELIVERED"), "success");
    assert.equal(transactionStatusVariant("CANCELLED"), "destructive");
  });

  it("maps financial variants", () => {
    assert.equal(transactionStatusVariant("PARTIALLY_PAID"), "warning");
    assert.equal(transactionStatusVariant("PAID"), "success");
    assert.equal(transactionStatusVariant("POSTED"), "success");
    assert.equal(transactionStatusVariant("VOID"), "destructive");
    assert.equal(transactionStatusVariant("OVERDUE"), "warning");
  });

  it("builds linear workflow steps", () => {
    const steps = buildLinearWorkflowSteps(
      [
        { id: "DRAFT", label: "Draft" },
        { id: "CONFIRMED", label: "Confirmed" },
        { id: "DELIVERED", label: "Delivered" },
      ],
      "CONFIRMED"
    );
    assert.equal(steps[0]?.done, true);
    assert.equal(steps[1]?.active, true);
    assert.equal(steps[2]?.done, false);
  });
});
