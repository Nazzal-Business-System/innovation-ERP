import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatEmployeeTenure, initialsFromEmployeeName } from "../employee-profile.ts";

describe("formatEmployeeTenure", () => {
  it("formats years and months from hire date", () => {
    const now = new Date(Date.UTC(2026, 6, 22));
    assert.equal(formatEmployeeTenure("2024-07-22", now), "2y");
    assert.equal(formatEmployeeTenure("2025-04-22", now), "1y 3mo");
    assert.equal(formatEmployeeTenure("2026-05-22", now), "2 mo");
  });
});

describe("initialsFromEmployeeName", () => {
  it("builds two-letter initials", () => {
    assert.equal(initialsFromEmployeeName("Sara Ahmad"), "SA");
    assert.equal(initialsFromEmployeeName(""), "?");
  });
});
