const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { runSync, keyOf } = require("../src/sync/runSync");
const { applyAliases, forBackend } = require("../src/sync/aliases");
const { compareSources } = require("../src/sync/compare");
const { buildReport, writeReport } = require("../src/sync/report");
const { batchCheck, createEvent, BackendAuthError, BATCH_SIZE } = require("../src/services/backendClient");

process.env.SYNC_API_KEY ||= "test-key"; // backendHeaders() needs one

const ev = (gameId, name, start, end, extra = {}) => ({
  game_id: gameId,
  event_name: name,
  start_date: start,
  expiry_date: end,
  daily_login: 0,
  event_type: "side",
  background_url: null,
  ...extra,
});

const collected = (valid, extra = {}) => ({
  valid,
  pending: [],
  invalid: [],
  dropped: [],
  warnings: [],
  currentVersion: { version: "3.8", releaseDate: "2026-11-12" },
  nextVersion: null,
  counts: { valid: valid.length, pending: 0, invalid: 0, dropped: 0 },
  ...extra,
});

function fakeBackend(existing = []) {
  const stored = new Set(existing.map(keyOf));
  const created = [];
  const checked = [];
  return {
    created,
    checked,
    async batchCheck(events) {
      checked.push(...events);
      return { existing: events.filter((e) => stored.has(keyOf(e))), new: events.filter((e) => !stored.has(keyOf(e))) };
    },
    async createEvent(event) {
      if (event.event_name === "Rejected") throw new Error("HTTP 400");
      created.push(event);
      return { eventId: created.length };
    },
  };
}

const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), "sync-")), "invalid-events.json");

const live = { key: "wuwa", gameId: 5, live: true };
const shadow = { key: "genshin", gameId: 4, live: false };

const SCRAPED = {
  wuwa: collected([ev(5, "Chord Cleansing", "2026-12-14", "2026-12-21"), ev(5, "Old One", "2026-11-12", "2026-12-21")]),
  genshin: collected([ev(4, "Silverwing in Pursuit of the Moon", "2026-11-11", "2026-12-02"), ev(4, "Frames of Fierce Splendor", "2026-11-27", "2026-12-07")]),
};
const LEGACY = {
  genshin: [ev(4, "Pursuit of the Moon", "2026-11-11", "2026-12-02"), ev(4, "Legacy Only Event", "2026-11-20", "2026-11-30")],
};
const IN_DB = [ev(5, "Old One", "2026-11-12", "2026-12-21"), ev(4, "Pursuit of the Moon", "2026-11-11", "2026-12-02")];

const run = (overrides = {}) => {
  const backend = overrides.backend || fakeBackend(IN_DB);
  return runSync({
    games: [live, shadow],
    scrape: async (c) => SCRAPED[c.key],
    legacyFetch: async (c) => LEGACY[c.key],
    backend,
    invalidEventsPath: tmpFile(),
    today: "2026-11-22",
    ...overrides,
  }).then((result) => ({ result, backend }));
};

test("live games insert the scraper's new events, shadow games the old source's", async () => {
  const { result, backend } = await run();
  assert.deepStrictEqual(backend.created.map((e) => e.event_name), ["Chord Cleansing", "Legacy Only Event"]);
  assert.strictEqual(result.insertedCount, 2);
  assert.deepStrictEqual(result.failures, []);

  // The shadow game's scraper rows are checked (for the report) but never inserted
  assert.ok(backend.checked.some((e) => e.event_name === "Frames of Fierce Splendor"));
  const genshin = result.perGame.find((g) => g.game === "genshin");
  assert.deepStrictEqual(genshin.scraperNew.map((e) => e.event_name), ["Silverwing in Pursuit of the Moon", "Frames of Fierce Splendor"]);
  assert.deepStrictEqual(genshin.inserted.map((e) => e.event_name), ["Legacy Only Event"]);
});

test("the old source is never run for a live game", async () => {
  const asked = [];
  await run({ legacyFetch: async (c) => (asked.push(c.key), LEGACY[c.key]) });
  assert.deepStrictEqual(asked, ["genshin"]);
});

test("shadow comparison and alias candidates", async () => {
  const { result } = await run();
  const genshin = result.perGame.find((g) => g.game === "genshin");
  assert.strictEqual(genshin.comparison.matched.length, 1);
  assert.deepStrictEqual(genshin.comparison.onlyScraper.map((e) => e.event_name), ["Frames of Fierce Splendor"]);
  assert.deepStrictEqual(genshin.comparison.onlyLegacy.map((e) => e.event_name), ["Legacy Only Event"]);
  assert.deepStrictEqual(genshin.aliasCandidates, [{ gameId: 4, sourceName: "Silverwing in Pursuit of the Moon", dbName: "Pursuit of the Moon" }]);
});

test("aliases rename scraped events to their DB name, so a live game doesn't insert them twice", async () => {
  const aliases = [{ gameId: 4, sourceName: "silverwing in pursuit of the moon", dbName: "Pursuit of the Moon" }];
  const { result, backend } = await run({ games: [{ ...shadow, live: true }], aliases });
  assert.deepStrictEqual(backend.created.map((e) => e.event_name), ["Frames of Fierce Splendor"]);
  assert.ok(!backend.created.some((e) => "aliasedFrom" in e), "report-only fields never reach the backend");
  assert.strictEqual(result.perGame[0].scraperExisting[0].aliasedFrom, "Silverwing in Pursuit of the Moon");
});

test("dry run: checks everything, writes nothing", async () => {
  const { result, backend } = await run({ dryRun: true });
  assert.deepStrictEqual(backend.created, []);
  assert.deepStrictEqual(result.toInsert.map((e) => e.event_name), ["Chord Cleansing", "Legacy Only Event"]);
  assert.deepStrictEqual(result.perGame.find((g) => g.game === "wuwa").wouldInsert.map((e) => e.event_name), ["Chord Cleansing"]);
});

test("a failing source only affects its own game; rejected writes are a failure", async () => {
  const { result, backend } = await run({
    scrape: async (c) => {
      if (c.key === "wuwa") throw Object.assign(new Error("heading not found"), { name: "SourceLayoutError" });
      return SCRAPED[c.key];
    },
    legacyFetch: async () => [ev(4, "Rejected", "2026-11-25", "2026-11-30"), ev(4, "Fine", "2026-11-25", "2026-11-30")],
  });
  assert.deepStrictEqual(backend.created.map((e) => e.event_name), ["Fine"]);
  assert.deepStrictEqual(
    result.failures.map((f) => [f.game, f.source, f.error.name]),
    [
      ["wuwa", "scraper", "SourceLayoutError"],
      ["all", "backend", "BackendWriteError"],
    ],
  );

  const legacyDown = await run({ legacyFetch: async () => Promise.reject(new Error("ennead down")) });
  assert.deepStrictEqual(legacyDown.result.failures.map((f) => f.source), ["old source"]);
  assert.deepStrictEqual(legacyDown.backend.created.map((e) => e.event_name), ["Chord Cleansing"]);
});

test("events the backend would reject are filtered out before the batch-check", async () => {
  const file = tmpFile();
  const bad = { ...SCRAPED.wuwa, valid: [ev(5, "Bad Date", "2026-1-5", "2026-12-21"), ...SCRAPED.wuwa.valid] };
  const { backend } = await run({ scrape: async (c) => (c.key === "wuwa" ? bad : SCRAPED[c.key]), invalidEventsPath: file });
  assert.ok(!backend.checked.some((e) => e.event_name === "Bad Date"));
  assert.match(fs.readFileSync(file, "utf8"), /Bad Date/);
});

test("pending and invalid scraper events go to invalid-events.json", async () => {
  const file = tmpFile();
  const withPending = collected(SCRAPED.wuwa.valid, {
    pending: [{ name: "Omega Trial", start: null, end: null, outcome: "pending", reason: "version 3.9 not dated yet", dateText: "Releases in Version 3.9" }],
  });
  await run({ scrape: async (c) => (c.key === "wuwa" ? withPending : SCRAPED[c.key]), invalidEventsPath: file });
  const saved = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.deepStrictEqual(saved.map((s) => [s.gameTag, s.source, s.events[0].reason]), [["wuwa", "scraper", "version 3.9 not dated yet"]]);
});

test("the report shows the table, the comparison and the alias snippet", async () => {
  const { result } = await run({ dryRun: true });
  const md = buildReport(result);
  assert.match(md, /## Event sync 2026-11-22 \(dry run: nothing written\)/);
  assert.match(md, /\| wuwa \| \*\*scraper\*\* \| 2 \| 1 \| 1 \|/);
  assert.match(md, /\| genshin \| old source \(shadow\) \|/);
  assert.match(md, /1 matched \(0 with different dates\), 1 only in the scraper, 1 only in the old source/);
  assert.match(md, /"sourceName":"Silverwing in Pursuit of the Moon","dbName":"Pursuit of the Moon"/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "report-"));
  writeReport(md, { file: path.join(dir, "r.md"), summaryFile: path.join(dir, "summary.md") });
  assert.strictEqual(fs.readFileSync(path.join(dir, "summary.md"), "utf8"), `${md}\n`);
});

test("compareSources and applyAliases on their own", () => {
  const cmp = compareSources([ev(5, "Gifts of Starpath", "2026-11-12", "2026-12-21")], [ev(5, "Gift of Starpath", "2026-11-12", "2026-12-20")]);
  assert.strictEqual(cmp.matched.length, 1);
  assert.deepStrictEqual([cmp.matched[0].sameName, cmp.matched[0].sameDates], [false, false]);
  const [renamed] = applyAliases([ev(5, "A", "2026-11-12", "2026-11-13")], [{ gameId: "5", sourceName: "a", dbName: "B" }]);
  assert.deepStrictEqual([renamed.event_name, renamed.aliasedFrom], ["B", "A"]);
  assert.ok(!("aliasedFrom" in forBackend(renamed)));
});

test("backend client: batch-check in chunks, auth errors named", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, size: body.length, key: options.headers["x-api-key"] });
    return { ok: true, json: async () => ({ existing: body.slice(0, 1), new: body.slice(1) }) };
  };
  const events = Array.from({ length: BATCH_SIZE * 2 + 50 }, (_, i) => ev(5, `E${i}`, "2026-11-12", "2026-11-20"));
  const result = await batchCheck(events, { fetchImpl, baseUrl: "https://api.test" });
  assert.deepStrictEqual(calls.map((c) => c.size), [BATCH_SIZE, BATCH_SIZE, 50]);
  assert.strictEqual(calls[0].url, "https://api.test/events/batch-check");
  assert.strictEqual(calls[0].key, process.env.SYNC_API_KEY);
  assert.strictEqual(result.existing.length + result.new.length, events.length);

  const refuse = async () => ({ ok: false, status: 403, json: async () => ({ message: "Forbidden" }) });
  await assert.rejects(createEvent(events[0], { fetchImpl: refuse, baseUrl: "https://api.test" }), BackendAuthError);
  const broken = async () => ({ ok: true, json: async () => ({}) });
  await assert.rejects(batchCheck(events.slice(0, 1), { fetchImpl: broken, baseUrl: "x" }), /unexpected response/);
});
