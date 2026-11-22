const test = require("node:test");
const assert = require("node:assert");
const { classify, eventType, dailyLogin } = require("../src/scraper/classify");

const config = { gameId: 5, daily: { extraPatterns: [/\bstamp rally\b/i] } };

test("event type: banner, version-bound, duration", () => {
  assert.deepStrictEqual(eventType({ kind: "banner", start: "2026-11-01", end: "2026-11-05" }), { type: "banner", reason: "banner section" });
  assert.strictEqual(eventType({ start: "2026-11-01", end: "2026-11-05", versionRef: { kind: "releases", version: "3.8" } }).type, "main");
  assert.strictEqual(eventType({ start: "2026-11-01", end: "2026-11-05", versionRef: { kind: "after", version: "3.8" } }).type, "main");
  // "until the end of Version X" says nothing about the type: duration decides
  assert.strictEqual(eventType({ start: "2026-11-25", end: "2026-12-02", versionRef: { kind: "endOf", version: "3.8" } }).type, "side");
  assert.deepStrictEqual(eventType({ start: "2026-11-01", end: "2026-12-02" }), { type: "main", reason: "31 days > 30" });
  assert.deepStrictEqual(eventType({ start: "2026-11-01", end: "2026-12-01" }), { type: "side", reason: "30 days" });
  assert.strictEqual(eventType({ start: null, end: null }).type, "side");
});

test("daily login: real examples from the pages", () => {
  const daily = (name, description = "") => dailyLogin({ name, description }, { gameId: 5 }).daily;
  assert.ok(daily("Gifts of Waking Moon", "A 7-day log-in event"));
  assert.ok(daily("Gift of Odyssey"));
  assert.ok(daily("7.1 Daily Login Event"));
  assert.ok(daily("Sanity Supply", "Log in once a day for one week to claim rewards"));
  assert.ok(daily("Whither the Wind", "Log-in for 7 days to claim Astrites"));
  assert.ok(daily("Check-In Bonus"));
  assert.ok(!daily("Chord Cleansing", "Reach Union Level 19"));
  assert.ok(!daily("Lollo Campaign", "Earn Lollo Stamps daily and spin the roulette")); // "daily" alone isn't login
});

test("daily-events.json overrides: force on, force off, per game", () => {
  const overrides = [
    { gameId: "5", eventName: "Pioneer Podcast" },
    { gameId: 5, eventName: "gifts of", daily: false },
    { gameId: "3", eventName: "Lollo" },
  ];
  assert.deepStrictEqual(dailyLogin({ name: "Pioneer Podcast 3.8" }, { gameId: 5, overrides }), {
    daily: true,
    reason: 'daily-events.json "Pioneer Podcast"',
  });
  assert.deepStrictEqual(dailyLogin({ name: "Gifts of Starpath" }, { gameId: 5, overrides }), {
    daily: false,
    reason: 'daily-events.json "gifts of" (forced off)',
  });
  assert.strictEqual(dailyLogin({ name: "Lollo Campaign" }, { gameId: 5, overrides }).daily, false); // other game's override
});

test("game-specific patterns and the classify() result", () => {
  const row = classify({ name: "Winter Stamp Rally", description: "", start: "2026-12-01", end: "2026-12-10" }, { config });
  assert.deepStrictEqual(
    { eventType: row.eventType, typeReason: row.typeReason, daily: row.daily, dailyReason: row.dailyReason },
    { eventType: "side", typeReason: "9 days", daily: true, dailyReason: "game pattern /\\bstamp rally\\b/i" },
  );
});
