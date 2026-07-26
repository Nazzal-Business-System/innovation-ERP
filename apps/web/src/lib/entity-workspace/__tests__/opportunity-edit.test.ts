import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOpportunityUpdateInput,
  opportunityEditHasChanges,
  parseMoneyInput,
  parseProbabilityInput,
} from "../../crm/opportunity-edit.ts";

const messages = {
  titleRequired: "title required",
  assigneeRequired: "assignee required",
  valueInvalid: "value invalid",
  probabilityInvalid: "probability invalid",
};

const baseline = {
  title: "Original",
  assignedToId: "11111111-1111-1111-1111-111111111111",
  stage: "NEGOTIATION" as const,
  estimatedValue: 1000,
  probability: 40,
  expectedCloseDate: "2026-08-01",
  notes: "Hello",
};

describe("parseMoneyInput", () => {
  it("parses currency display strings", () => {
    assert.equal(parseMoneyInput("JOD 1,250.50"), 1250.5);
  });

  it("rejects empty and negative", () => {
    assert.equal(parseMoneyInput(""), null);
    assert.equal(parseMoneyInput("-3"), null);
  });
});

describe("parseProbabilityInput", () => {
  it("accepts integers 0-100", () => {
    assert.equal(parseProbabilityInput("0"), 0);
    assert.equal(parseProbabilityInput("65"), 65);
  });

  it("rejects decimals and out of range", () => {
    assert.equal(parseProbabilityInput("12.5"), null);
    assert.equal(parseProbabilityInput("101"), null);
  });
});

describe("buildOpportunityUpdateInput", () => {
  it("returns field errors for invalid draft", () => {
    const result = buildOpportunityUpdateInput(
      baseline,
      {
        title: "  ",
        assignedToId: null,
        stage: "NEGOTIATION",
        estimatedValue: "",
        probability: "abc",
        expectedCloseDate: "",
        notes: "",
      },
      messages
    );
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.errors.title, messages.titleRequired);
      assert.equal(result.errors.assignee, messages.assigneeRequired);
      assert.equal(result.errors.estimatedValue, messages.valueInvalid);
      assert.equal(result.errors.probability, messages.probabilityInvalid);
    }
  });

  it("returns empty input when unchanged", () => {
    const result = buildOpportunityUpdateInput(
      baseline,
      {
        title: "Original",
        assignedToId: baseline.assignedToId,
        stage: "NEGOTIATION",
        estimatedValue: "1000",
        probability: "40",
        expectedCloseDate: "2026-08-01",
        notes: "Hello",
      },
      messages
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(opportunityEditHasChanges(result.input), false);
    }
  });

  it("includes only changed fields (does not force stage)", () => {
    const result = buildOpportunityUpdateInput(
      { ...baseline, stage: "WON" },
      {
        title: "Renamed deal",
        assignedToId: baseline.assignedToId,
        stage: "WON",
        estimatedValue: "1000",
        probability: "40",
        expectedCloseDate: "2026-08-01",
        notes: "Hello",
      },
      messages
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.input, { title: "Renamed deal" });
      assert.equal("stage" in result.input, false);
    }
  });

  it("includes stage only when it actually changes", () => {
    const result = buildOpportunityUpdateInput(
      baseline,
      {
        title: "Original",
        assignedToId: baseline.assignedToId,
        stage: "PROPOSAL",
        estimatedValue: "1000",
        probability: "40",
        expectedCloseDate: "2026-08-01",
        notes: "Hello",
      },
      messages
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.input, { stage: "PROPOSAL" });
    }
  });
});
