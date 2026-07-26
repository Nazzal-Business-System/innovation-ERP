import type { AttendanceStatus, HrAttendanceRecord } from "@ierp/shared";

/** Canonical self-service attendance table column order. */
export const SELF_ATTENDANCE_COLUMN_ORDER = [
  "date",
  "checkIn",
  "checkOut",
  "status",
  "notes",
] as const;

export type SelfAttendanceColumnId = (typeof SELF_ATTENDANCE_COLUMN_ORDER)[number];

export type SelfAttendanceTableCells = {
  date: string;
  checkIn: string;
  checkOut: string;
  status: AttendanceStatus;
  notes: string;
};

/**
 * Maps an attendance API record to table cells in fixed column order.
 * Prevents accidental field/header swaps in the employee attendance table.
 */
export function mapSelfAttendanceTableRow(
  record: Pick<HrAttendanceRecord, "date" | "checkIn" | "checkOut" | "status" | "notes">
): SelfAttendanceTableCells {
  return {
    date: record.date,
    checkIn: record.checkIn ?? "—",
    checkOut: record.checkOut ?? "—",
    status: record.status,
    notes: record.notes ?? "—",
  };
}

/** Values in SELF_ATTENDANCE_COLUMN_ORDER sequence — useful for regression tests. */
export function selfAttendanceCellsInColumnOrder(
  cells: SelfAttendanceTableCells
): Array<string | AttendanceStatus> {
  return SELF_ATTENDANCE_COLUMN_ORDER.map((key) => cells[key]);
}
