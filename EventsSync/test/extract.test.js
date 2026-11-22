const test = require("node:test");
const assert = require("node:assert");
const { extractSection } = require("../src/scraper/extract");
const { SourceLayoutError } = require("../src/scraper/errors");
const { load$, IMG } = require("./helpers");
const source = require("../src/scraper/source");

const $ = load$("layouts.html");
const run = (section) => extractSection($, { page: "home", status: "ongoing", ...section }, { game: "testgame", url: "https://site.test/x" });
const pick = (rows, ...keys) => rows.map((r) => Object.fromEntries(keys.map((k) => [k, r[k]])));

test("range: name link, real image only, date before <hr>, wrapped ranges joined", () => {
  const { rows } = run({ heading: /^Current Events$/, layout: "range" });
  assert.deepStrictEqual(pick(rows, "name", "image", "dateText", "description"), [
    { name: "Alpha Festival", image: `${IMG}/a.png/show`, dateText: "10/01/2026 - 11/03/2026", description: "Reward: 420 gems" },
    { name: "Beta Trial", image: null, dateText: "November 19, 2026 - December 3, 2026", description: "Reach level 14" },
  ]);
  assert.strictEqual(rows[0].link, `${source.baseUrl}/games/Test-Game/archives/1`);
  assert.strictEqual(rows[1].link, "https://example.test/b");
  assert.deepStrictEqual(pick(rows, "game", "source", "section", "status", "kind", "singleDate")[0], {
    game: "testgame",
    source: "home",
    section: "Current Events",
    status: "ongoing",
    kind: "event",
    singleDate: "start",
  });
});

test("range: labels and version references stay in the date text", () => {
  const { rows } = run({ heading: /^Upcoming Events$/, layout: "range", status: "upcoming" });
  assert.deepStrictEqual(pick(rows, "name", "dateText"), [
    { name: "4.7 Gamma Rift", dateText: "Start: 11/23/2026 - 12/07/2026 Get double rewards" },
    { name: "Delta Return", dateText: "Releases in Version 4.8" },
  ]);
});

test("multiPerRow: one event per cell, empty cells skipped, table picked by its first row", () => {
  const { rows } = run({ heading: /^Two Per Row$/, table: /End Dates/, layout: "multiPerRow", singleDate: "end" });
  assert.deepStrictEqual(pick(rows, "name", "image", "dateText", "singleDate"), [
    { name: "Epsilon Run", image: `${IMG}/e.png`, dateText: "December 21, 2026", singleDate: "end" },
    { name: "Zeta Gifts", image: `${IMG}/z.png`, dateText: "11/11/2026 - 12/23/2026", singleDate: "end" },
    { name: "Eta Puzzle", image: null, dateText: "December 3, 2026", singleDate: "end" },
  ]);

  const second = run({ heading: /^Two Per Row$/, table: /^Upcoming Events/, layout: "range" });
  assert.deepStrictEqual(pick(second.rows, "name", "dateText"), [{ name: "Theta Fair", dateText: "December 14, 2026 - December 21, 2026 Win prizes" }]);
});

test("splitRows: Start and End rows belong to the event above", () => {
  const { rows } = run({ heading: /^Split Rows$/, layout: "splitRows" });
  assert.deepStrictEqual(pick(rows, "name", "image", "dateText"), [
    { name: "Iota Album", image: `${IMG}/i.png`, dateText: "Start October 22, 2026 End November 30, 2026" },
    { name: "Kappa Repair!", image: null, dateText: "Start November 16, 2026 End November 30, 2026" },
  ]);
});

test("headingPerEvent: one sub-heading per event, summary and unlock tables skipped", () => {
  const { rows } = run({ page: "events", heading: /^List of Current Events$/, layout: "headingPerEvent", itemLevel: "h3" });
  assert.deepStrictEqual(pick(rows, "name", "image", "dateText"), [
    { name: "Lambda Movie: Overheated", image: `${IMG}/l.png`, dateText: "Event Start November 4, 2026 Event End December 16, 2026" },
    { name: "Mu Journey", image: `${IMG}/m.png`, dateText: "Duration Nov. 11, 2026 - Dec. 23, 2026" },
  ]);

  const h4 = run({ page: "events", heading: /Events Summary$/, layout: "headingPerEvent", itemLevel: "h4" });
  assert.deepStrictEqual(pick(h4.rows, "name", "dateText"), [
    { name: "Nu Dreams", dateText: "Event Duration November 12, 2026 - December 21, 2026" },
    { name: "Xi Campaign", dateText: "Event Duration December 3, 2026 - December 17, 2026" },
  ]);
});

test("layout errors are specific and carry context", () => {
  assert.throws(
    () => run({ heading: /^Renamed Heading$/, layout: "range" }),
    (e) => e instanceof SourceLayoutError && /heading not found/.test(e.message) && e.context.game === "testgame" && e.fileHint.includes("games/testgame.js"),
  );
  assert.throws(() => run({ heading: /^No Table Here$/, layout: "range" }), /no table under the heading/);
  assert.throws(() => run({ heading: /^Two Per Row$/, table: /^Nope/, layout: "range" }), /no table matching/);
  assert.throws(
    () => run({ heading: /^Nameless Row$/, layout: "range" }),
    (e) => /row without a name/.test(e.message) && e.context.rowHtml.includes("10/01/2026"),
  );
  assert.throws(() => run({ heading: /^Empty Ongoing$/, layout: "range" }), /no rows found/);
  assert.throws(() => run({ heading: /^Current Events$/, layout: "zigzag" }), /Unknown layout "zigzag"/);
});

test("optional sections only warn", () => {
  const missing = run({ heading: /^Renamed Heading$/, layout: "range", optional: true });
  assert.deepStrictEqual(missing.rows, []);
  assert.match(missing.warnings[0], /heading not found \(optional, skipped\)/);

  const emptyUpcoming = run({ heading: /^Empty Ongoing$/, layout: "range", status: "upcoming" });
  assert.deepStrictEqual(emptyUpcoming, { rows: [], warnings: [] });
});
