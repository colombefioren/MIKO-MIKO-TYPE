import { test } from "node:test";
import assert from "node:assert/strict";
import { calendarDate, timeAgo } from "../public/js/lib/format.js";

const now = new Date(2026, 9, 18);

test("calendarDate leaves the year out for the current year", () => {
  assert.doesNotMatch(calendarDate(new Date(2026, 5, 18), { now }), /2026/);
});

test("calendarDate shows the year for other years", () => {
  assert.match(calendarDate(new Date(2025, 5, 18), { now }), /2025/);
  assert.match(calendarDate(new Date(2025, 5, 18), { now, weekday: true }), /2025/);
});

test("timeAgo shows the year for old dates from another year", () => {
  assert.match(timeAgo(new Date(new Date().getFullYear() - 1, 0, 5)), new RegExp(String(new Date().getFullYear() - 1)));
  assert.equal(timeAgo(new Date(Date.now() - 30_000)), "just now");
});
