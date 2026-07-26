import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addMonthsLocal,
  apiDateToIsoUtcNoon,
  clampApiDate,
  compareApiDates,
  daysInMonth,
  formatDisplayDate,
  formatDisplayDateRange,
  formatDisplayDateTime,
  formatEntityTimestamp,
  formatRelativeTime,
  isSameDay,
  isValidApiDate,
  parseApiDate,
  startOfMonth,
  toApiDate,
  todayApiDate,
} from "../../date.ts";

describe("parseApiDate", () => {
  it("parses YYYY-MM-DD as a local calendar date", () => {
    const date = parseApiDate("2026-07-21");
    assert.ok(date);
    assert.equal(date.getFullYear(), 2026);
    assert.equal(date.getMonth(), 6);
    assert.equal(date.getDate(), 21);
  });

  it("accepts ISO datetimes by taking the date prefix", () => {
    const date = parseApiDate("2026-07-21T15:30:00.000Z");
    assert.ok(date);
    assert.equal(date.getFullYear(), 2026);
    assert.equal(date.getMonth(), 6);
    assert.equal(date.getDate(), 21);
  });

  it("rejects empty, malformed, and impossible dates", () => {
    assert.equal(parseApiDate(null), null);
    assert.equal(parseApiDate(undefined), null);
    assert.equal(parseApiDate(""), null);
    assert.equal(parseApiDate("21-07-2026"), null);
    assert.equal(parseApiDate("2026-13-01"), null);
    assert.equal(parseApiDate("2026-02-31"), null);
  });
});

describe("toApiDate / todayApiDate", () => {
  it("formats a local Date as YYYY-MM-DD", () => {
    assert.equal(toApiDate(new Date(2026, 6, 21)), "2026-07-21");
  });

  it("returns today's local calendar date", () => {
    assert.equal(todayApiDate(), toApiDate(new Date()));
  });
});

describe("apiDateToIsoUtcNoon", () => {
  it("converts date-only values to UTC noon ISO", () => {
    assert.equal(apiDateToIsoUtcNoon("2026-07-21"), "2026-07-21T12:00:00.000Z");
  });

  it("returns the original value when unparseable", () => {
    assert.equal(apiDateToIsoUtcNoon("not-a-date"), "not-a-date");
  });
});

describe("formatDisplayDate / formatDisplayDateRange", () => {
  it("formats en and ar locales", () => {
    const en = formatDisplayDate("2026-07-21", "en");
    const ar = formatDisplayDate("2026-07-21", "ar");
    assert.notEqual(en, "—");
    assert.notEqual(ar, "—");
    assert.match(en, /2026/);
  });

  it("returns em dash for invalid dates", () => {
    assert.equal(formatDisplayDate(null, "en"), "—");
    assert.equal(formatDisplayDate("bad", "en"), "—");
  });

  it("formats ranges with missing ends", () => {
    assert.equal(formatDisplayDateRange(null, null, "en"), "—");
    assert.match(formatDisplayDateRange("2026-07-01", null, "en"), /2026/);
    assert.match(formatDisplayDateRange(null, "2026-07-31", "en"), /2026/);
    assert.match(formatDisplayDateRange("2026-07-01", "2026-07-31", "en"), /→/);
  });
});

describe("formatDisplayDateTime / formatRelativeTime", () => {
  it("formats ISO instants in local time", () => {
    const formatted = formatDisplayDateTime("2026-07-21T12:00:00.000Z", "en");
    assert.notEqual(formatted, "—");
    assert.equal(formatDisplayDateTime(null, "en"), "—");
    assert.equal(formatDisplayDateTime("not-a-date", "en"), "—");
  });

  it("formats relative times", () => {
    const recent = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const relative = formatRelativeTime(recent, "en");
    assert.notEqual(relative, "—");
    assert.equal(formatRelativeTime(null, "en"), "—");
  });
});

describe("formatEntityTimestamp", () => {
  it("formats ISO instants and date-only values", () => {
    const iso = formatEntityTimestamp("2026-07-21T12:00:00.000Z", "en");
    assert.ok(iso);
    assert.match(iso, /2026/);
    assert.equal(formatEntityTimestamp("2026-07-21", "en"), formatDisplayDate("2026-07-21", "en"));
  });

  it("preserves already-localized strings", () => {
    assert.equal(formatEntityTimestamp("21 Jul 2026, 15:00", "en"), "21 Jul 2026, 15:00");
    assert.equal(formatEntityTimestamp(null, "en"), undefined);
  });
});

describe("date helpers", () => {
  it("validates and compares API dates", () => {
    assert.equal(isValidApiDate("2026-07-21"), true);
    assert.equal(isValidApiDate("bad"), false);
    assert.ok(compareApiDates("2026-07-01", "2026-07-21") < 0);
  });

  it("clamps dates within bounds", () => {
    assert.equal(clampApiDate("2026-07-15", "2026-07-10", "2026-07-20"), "2026-07-15");
    assert.equal(clampApiDate("2026-07-01", "2026-07-10", "2026-07-20"), "2026-07-10");
    assert.equal(clampApiDate("2026-07-31", "2026-07-10", "2026-07-20"), "2026-07-20");
  });

  it("handles month arithmetic and same-day checks", () => {
    assert.equal(daysInMonth(2024, 1), 29);
    assert.equal(daysInMonth(2026, 1), 28);
    const jan31 = new Date(2026, 0, 31);
    const feb = addMonthsLocal(jan31, 1);
    assert.equal(feb.getMonth(), 1);
    assert.equal(feb.getDate(), 28);
    const start = startOfMonth(new Date(2026, 6, 21));
    assert.equal(start.getDate(), 1);
    assert.equal(isSameDay(new Date(2026, 6, 21), new Date(2026, 6, 21, 23)), true);
    assert.equal(isSameDay(new Date(2026, 6, 21), new Date(2026, 6, 22)), false);
  });
});
