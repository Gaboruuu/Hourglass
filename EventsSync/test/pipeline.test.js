// The whole pipeline (EventScraper.collect) on synthetic pages, with a fake client: no network.
const test = require("node:test");
const assert = require("node:assert");
const { EventScraper } = require("../src/scraper/EventScraper");
const source = require("../src/scraper/source");
const { fixture, IMG } = require("./helpers");

const base = `${source.baseUrl}/games/Test-Game`;
const PAGES = {
  [base]: "pipeline-home.html",
  [`${base}/archives/301`]: "pipeline-events.html",
  [`${base}/archives/490`]: "pipeline-version-4.9.html",
  [`${base}/archives/480`]: "pipeline-version-4.8.html",
  [`${base}/archives/470`]: "pipeline-version-4.7.html",
};

function fakeClient() {
  const fetched = [];
  return {
    fetched,
    get requests() {
      return fetched.length;
    },
    async get(url) {
      if (!PAGES[url]) throw new Error(`unexpected request ${url}`);
      fetched.push(url);
      return fixture(PAGES[url]);
    },
  };
}

const config = {
  key: "testgame",
  gameId: 99,
  enabled: true,
  slug: "Test-Game",
  pages: { events: { find: /^All Events and Schedule$/i, url: "/games/Test-Game/archives/1" } },
  sections: [
    { page: "home", heading: /^Current Events$/i, status: "ongoing", layout: "range" },
    { page: "home", heading: /^Upcoming Events$/i, status: "upcoming", layout: "range", optional: true },
    { page: "events", heading: /Ongoing Event Schedule$/i, status: "ongoing", layout: "splitRows" },
  ],
  version: { find: /^Version (\d+\.\d+)$/i, release: [{ row: /^Release Date$/i }], releaseTime: "serverTable", cadenceDays: 42 },
  daily: { extraPatterns: [] },
};

async function run() {
  const client = fakeClient();
  const scraper = new EventScraper(config, {
    client,
    today: "2026-11-19",
    ignored: [{ gameId: "99", eventName: "Livestream for", reason: "no event dates" }],
    dailyOverrides: [],
  });
  return { client, result: await scraper.collect() };
}

test("pipeline: requests, versions, counts", async () => {
  const { client, result } = await run();
  assert.deepStrictEqual(client.fetched, [base, `${base}/archives/301`, `${base}/archives/490`, `${base}/archives/480`, `${base}/archives/470`]);
  assert.strictEqual(result.currentVersion.version, "4.7");
  assert.strictEqual(result.currentVersion.releaseAt, "2026-11-11T03:00:00Z");
  assert.strictEqual(result.nextVersion.version, "4.8");
  assert.deepStrictEqual(result.counts, { raw: 11, merged: 9, valid: 3, pending: 2, invalid: 2, dropped: 2, withoutImage: 2 });
});

test("pipeline: the rows sent to the DB", async () => {
  const { result } = await run();
  assert.deepStrictEqual(result.valid, [
    {
      game_id: 99,
      event_name: "Silverwing in Pursuit of the Moon", // longest name; year from the events page
      start_date: "2026-11-11",
      expiry_date: "2026-12-02",
      daily_login: 0,
      event_type: "side",
      background_url: `${IMG}/moon.png`, // events page has no image: home's is used
    },
    {
      game_id: 99,
      event_name: "Seven-Day Bonus",
      start_date: "2026-11-11",
      expiry_date: "2026-11-25",
      daily_login: 1, // "Log in for 7 days" in the description
      event_type: "side",
      background_url: null,
    },
    {
      game_id: 99,
      event_name: "Echo Hunt",
      start_date: "2026-11-25",
      expiry_date: "2026-12-02", // end of 4.7 = release of 4.8
      daily_login: 0,
      event_type: "side",
      background_url: null,
    },
  ]);
});

test("pipeline: pending, invalid and dropped rows with their reasons", async () => {
  const { result } = await run();
  const reasons = (rows) => rows.map((r) => [r.name, r.reason]);
  assert.deepStrictEqual(reasons(result.pending), [
    ["Omega Trial", "version 4.9 not dated yet"],
    ["Long Haul", "estimated end (Version 4.8)"],
  ]);
  assert.deepStrictEqual(reasons(result.invalid), [
    ["Conflict Cup", "pages disagree: end 2026-11-30 vs 2026-12-10"],
    ["Typo Date Event", 'can\'t read the date: "31/11/2026" is not a MM/DD date: "Start 31/11/2026 End 12/05/2026"'],
  ]);
  assert.deepStrictEqual(reasons(result.dropped), [
    ["Old Festival", "ended"],
    ["Livestream for Version 4.8", "ignored (no event dates)"],
  ]);
  const longHaul = result.pending.find((r) => r.name === "Long Haul");
  assert.deepStrictEqual([longHaul.start, longHaul.end, longHaul.endEstimated], ["2026-12-02", "2027-01-13", true]);
});
