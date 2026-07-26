import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { HrAttendanceRecord } from "@ierp/shared";
import {
  mapSelfAttendanceTableRow,
  SELF_ATTENDANCE_COLUMN_ORDER,
  selfAttendanceCellsInColumnOrder,
} from "../hr/self-attendance-table.ts";

const fixture: HrAttendanceRecord = {
  id: "att-1",
  date: "2026-07-24",
  checkIn: "08:45",
  checkOut: "17:10",
  status: "REMOTE",
  notes: "Working from home",
  employee: {
    id: "emp-1",
    employeeNumber: "EMP-0010",
    fullName: "Employee One",
    department: "Operations",
    workLocation: "Amman HQ",
  },
};

describe("self-service attendance table mapping", () => {
  it("keeps column order Date → Check in → Check out → Status → Notes", () => {
    assert.deepEqual([...SELF_ATTENDANCE_COLUMN_ORDER], [
      "date",
      "checkIn",
      "checkOut",
      "status",
      "notes",
    ]);
  });

  it("maps each field to the correct column (no swaps)", () => {
    const cells = mapSelfAttendanceTableRow(fixture);
    assert.equal(cells.date, "2026-07-24");
    assert.equal(cells.checkIn, "08:45");
    assert.equal(cells.checkOut, "17:10");
    assert.equal(cells.status, "REMOTE");
    assert.equal(cells.notes, "Working from home");

    assert.deepEqual(selfAttendanceCellsInColumnOrder(cells), [
      "2026-07-24",
      "08:45",
      "17:10",
      "REMOTE",
      "Working from home",
    ]);
  });

  it("uses placeholders for empty check-in/out/notes without shifting status", () => {
    const cells = mapSelfAttendanceTableRow({
      ...fixture,
      checkIn: null,
      checkOut: null,
      status: "ABSENT",
      notes: null,
    });

    assert.deepEqual(selfAttendanceCellsInColumnOrder(cells), [
      "2026-07-24",
      "—",
      "—",
      "ABSENT",
      "—",
    ]);
    // Status must remain in the 4th column, not slide left into check-in/out.
    assert.equal(cells.status, "ABSENT");
    assert.equal(cells.checkIn, "—");
    assert.equal(cells.checkOut, "—");
  });
});
