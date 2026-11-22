const test = require("node:test");
const assert = require("node:assert");
const { validateRow } = require("../src/scraper/validate");

const today = "2026-11-19";
const base = { name: "Test Event", start: "2026-11-10", end: "2026-12-01", startYearInferred: false, endYearInferred: false };
const check = (overrides, options = {}) => validateRow({ ...base, ...overrides }, { today, gameId: 5, ...options });

test("valid row (an image is optional)", () => {
  assert.deepStrictEqual(check({ image: null }), { outcome: "valid", reason: null });
});

test("dropped: ignored-events.json and ended rows", () => {
  const ignored = [{ gameId: "5", eventName: "livestream for", reason: "no event dates" }];
  assert.deepStrictEqual(check({ name: "Livestream for 3.8" }, { ignored }), { outcome: "dropped", reason: "ignored (no event dates)" });
  assert.strictEqual(check({ name: "Livestream for 3.8" }, { ignored, gameId: 4 }).outcome, "valid"); // other game
  assert.deepStrictEqual(check({ start: "2026-10-01", end: "2026-11-18" }), { outcome: "dropped", reason: "ended" });
  // an ended row with a problem is still just dropped (stale rows aren't worth a look)
  assert.strictEqual(check({ end: "2026-11-01", conflict: "pages disagree: end …" }).outcome, "dropped");
  assert.strictEqual(check({ end: "2026-11-19" }).outcome, "valid"); // ends today: still running
});

test("pending: expected to resolve on a later run", () => {
  assert.deepStrictEqual(check({ end: null, unresolved: "version 3.9 not dated yet" }), { outcome: "pending", reason: "version 3.9 not dated yet" });
  assert.deepStrictEqual(check({ endEstimated: true, versionRef: { kind: "endOf", version: "3.8" } }), {
    outcome: "pending",
    reason: "estimated end (Version 3.8)",
  });
});

test("invalid: needs a look", () => {
  assert.match(check({ dateError: 'can\'t parse: "22/09"' }).reason, /can't read the date/);
  assert.strictEqual(check({ name: "  " }).reason, "bad name");
  assert.strictEqual(check({ name: "x".repeat(256) }).reason, "bad name");
  assert.strictEqual(check({ conflict: "pages disagree: end 2026-11-30 vs 2026-12-10" }).reason, "pages disagree: end 2026-11-30 vs 2026-12-10");
  assert.strictEqual(check({ start: null, end: null }).reason, "missing start/end");
  assert.strictEqual(check({ end: null }).reason, "no end date");
  assert.strictEqual(check({ start: null }).reason, "no start date");
  assert.strictEqual(check({ start: "2026-12-05", end: "2026-12-01" }).reason, "start after end");
  assert.match(check({ end: "2027-12-01" }).reason, /^implausible date \(end 2027-12-01, source typo\?\)$/);
  assert.match(check({ start: "2026-11-10", end: "2027-04-01", endYearInferred: true }).reason, /year guessed/);
  assert.strictEqual(check({ start: "2026-11-10", end: "2027-03-01", endYearInferred: true }).outcome, "valid"); // 102 days
});
