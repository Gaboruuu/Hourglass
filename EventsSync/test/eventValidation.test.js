// node --test test/eventValidation.test.js  (npm run test:unit)
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { getBackendProblems, filterBackendValid } = require("../src/services/eventValidation");

const valid = {
  game_id: 5,
  event_name: "Valid Event",
  start_date: "2026-10-01",
  expiry_date: "2026-10-20",
  daily_login: 0,
  event_type: "side",
  background_url: "https://img.game8.co/1/a.png/show",
};

test("accepts what the backend accepts", () => {
  for (const change of [
    {},
    { expiry_date: "2026-10-01" }, // one-day event
    { background_url: null },
    { daily_login: true },
    { event_type: "main" },
    { event_name: "  Spaced  " }, // the backend trims it
  ]) {
    assert.deepStrictEqual(getBackendProblems({ ...valid, ...change }), [], JSON.stringify(change));
  }
});

test("rejects dates the fetchers' Date.parse check lets through", () => {
  for (const date of ["2025/02/12", "2026-1-5", "2026-01-05 10:00", "Feb 12 2026", "2026-02-30", "End of Version 3.7"]) {
    assert.ok(getBackendProblems({ ...valid, start_date: date }).length > 0, date);
  }
});

test("rejects everything else the backend would reject", () => {
  for (const change of [
    { start_date: "2026-10-21" }, // after expiry
    { background_url: "http://x.com/a.png" },
    { background_url: "" },
    { event_type: "banner" },
    { event_name: "   " },
    { event_name: "x".repeat(256) },
    { game_id: "5" },
    { daily_login: 2 },
  ]) {
    assert.ok(getBackendProblems({ ...valid, ...change }).length > 0, JSON.stringify(change));
  }
});

test("filterBackendValid keeps valid events and writes the rest to invalid-events.json", () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "sync-")), "invalid-events.json");
  fs.writeFileSync(file, JSON.stringify([{ source: "hoyoverse", events: [] }])); // fetchers write first

  const bad = { ...valid, event_name: "Bad", start_date: "2026-1-5" };
  const { valid: kept, rejected } = filterBackendValid([valid, bad], file);

  assert.deepStrictEqual(kept, [valid]);
  assert.strictEqual(rejected.length, 1);
  const written = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.strictEqual(written.length, 2, "appends to what the fetchers wrote");
  assert.strictEqual(written[1].source, "backend-rules");
  assert.strictEqual(written[1].events[0].event_name, "Bad");
  assert.match(written[1].events[0].reasons[0], /start_date "2026-1-5"/);
});
