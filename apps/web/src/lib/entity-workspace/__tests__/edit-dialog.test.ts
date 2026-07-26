import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldAllowEditDialogClose } from "../edit-dialog.ts";

describe("shouldAllowEditDialogClose", () => {
  it("allows open and idle close", () => {
    assert.equal(shouldAllowEditDialogClose(false, true), true);
    assert.equal(shouldAllowEditDialogClose(false, false), true);
  });

  it("blocks close while submitting", () => {
    assert.equal(shouldAllowEditDialogClose(true, false), false);
    assert.equal(shouldAllowEditDialogClose(true, true), true);
  });
});
