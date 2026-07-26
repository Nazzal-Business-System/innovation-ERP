import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  resolveAccountDisplaySource,
  resolveEmployeeDisplaySource,
} from "../resolve-display.ts";

describe("avatar display resolution", () => {
  it("prefers employee photo on employee surfaces", () => {
    const source = resolveEmployeeDisplaySource({
      employeeId: "e1",
      hasEmployeeAvatar: true,
      employeeAvatarUpdatedAt: "2026-01-01",
      allowUserFallback: true,
      linkedUserId: "u1",
      hasUserAvatar: true,
    });
    assert.equal(source.kind, "employee");
  });

  it("falls back to user avatar when allowed and employee has no photo", () => {
    const source = resolveEmployeeDisplaySource({
      employeeId: "e1",
      hasEmployeeAvatar: false,
      allowUserFallback: true,
      linkedUserId: "u1",
      hasUserAvatar: true,
      userAvatarUpdatedAt: "2026-01-02",
    });
    assert.equal(source.kind, "user");
    if (source.kind === "user") assert.equal(source.userId, "u1");
  });

  it("prefers account avatar on account surfaces", () => {
    const source = resolveAccountDisplaySource({
      userId: "u1",
      hasUserAvatar: true,
      allowEmployeeFallback: true,
      linkedEmployeeId: "e1",
      hasEmployeeAvatar: true,
    });
    assert.equal(source.kind, "user");
  });

  it("returns none when neither photo exists", () => {
    assert.equal(
      resolveEmployeeDisplaySource({
        employeeId: "e1",
        hasEmployeeAvatar: false,
      }).kind,
      "none"
    );
  });
});
