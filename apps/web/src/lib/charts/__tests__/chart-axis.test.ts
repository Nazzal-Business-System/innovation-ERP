import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatChartDateTick,
  humanizeEnumLabel,
  resolveChartLabel,
  shouldUseHorizontalCategoryBars,
  truncateChartLabel,
} from "../chart-axis-utils.ts";

describe("chart-axis helpers", () => {
  it("humanizes enum labels", () => {
    assert.equal(humanizeEnumLabel("PARTIALLY_RECEIVED"), "Partially received");
    assert.equal(humanizeEnumLabel("READY_TO_SHIP"), "Ready to ship");
    assert.equal(humanizeEnumLabel("IN_PROGRESS"), "In progress");
  });

  it("prefers map labels when provided", () => {
    assert.equal(
      resolveChartLabel("OPEN", { OPEN: "Open" }),
      "Open"
    );
  });

  it("truncates with ellipsis", () => {
    assert.equal(truncateChartLabel("Very Long Category Name", 10), "Very Long…");
    assert.equal(truncateChartLabel("Short", 10), "Short");
  });

  it("formats month ticks", () => {
    assert.match(formatChartDateTick("2026-03"), /Mar/);
  });

  it("switches to horizontal bars for long labels", () => {
    assert.equal(
      shouldUseHorizontalCategoryBars({
        labels: ["Partially received", "Ready to ship"],
        containerWidth: 800,
      }),
      true
    );
    assert.equal(
      shouldUseHorizontalCategoryBars({
        labels: ["Draft", "Sent"],
        containerWidth: 800,
      }),
      false
    );
  });
});
