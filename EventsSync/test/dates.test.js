const test = require("node:test");
const assert = require("node:assert");
const { parseDateText, fillMissingStart, addDays, diffDays, toIso } = require("../src/scraper/dates");
const { SourceDateError } = require("../src/scraper/errors");

const today = "2026-10-05";
const parse = (text, opts = {}) => parseDateText(text, { today, ...opts });
const range = (text, opts) => {
  const r = parse(text, opts);
  return [r.start, r.end];
};

test("formats with a year", () => {
  assert.deepStrictEqual(range("09/24/2026 - 10/12/2026"), ["2026-09-24", "2026-10-12"]);
  assert.deepStrictEqual(range("Period: 08/26/26 - 09/16/26"), ["2026-08-26", "2026-09-16"]);
  assert.deepStrictEqual(range("Start: 2026/09/23 End: 2026/10/13"), ["2026-09-23", "2026-10-13"]);
  assert.deepStrictEqual(range("September 22, 2026 - September 29, 2026"), ["2026-09-22", "2026-09-29"]);
  assert.deepStrictEqual(range("Aug. 20, 2026 - Sept. 30, 2026 42 days"), ["2026-08-20", "2026-09-30"]);
  assert.deepStrictEqual(range("Sep 3, 2026 – Oct 1, 2026"), ["2026-09-03", "2026-10-01"]);
});

test("labels on separate parts (split rows, 'Event Start/End')", () => {
  assert.deepStrictEqual(range("Start | September 9, 2026 End | October 10, 2026"), ["2026-09-09", "2026-10-10"]);
  assert.deepStrictEqual(range("Event Start November 4, 2026 Event End December 16, 2026"), ["2026-11-04", "2026-12-16"]);
  assert.deepStrictEqual(range("End: 2026/10/13 Start: 2026/09/23"), ["2026-09-23", "2026-10-13"]);
});

test("region notes, server time, clock times and ordinals are dropped", () => {
  assert.deepStrictEqual(range("Duration: 09/27 (UTC-5) - 11/10/2026 (Server Time)"), ["2026-09-27", "2026-11-10"]);
  assert.deepStrictEqual(range("2026/09/23 10:00 - 2026/10/13 03:59 (UTC+8)"), ["2026-09-23", "2026-10-13"]);
  assert.deepStrictEqual(range("September 28th, 2026 10:00 AM - October 3rd, 2026 (NA Servers)"), ["2026-09-28", "2026-10-03"]);
  assert.deepStrictEqual(range("Current Banners (Sept. 24, 2026)"), ["2026-09-24", null]);
});

test("a year from the other end of the range is not 'inferred'", () => {
  const r = parse("09/27 (UTC-5) - 11/10/2026");
  assert.strictEqual(r.start, "2026-09-27");
  assert.strictEqual(r.startYearInferred, false);
  // end before start in the calendar → the start is in the previous year
  assert.deepStrictEqual(range("12/20 - 01/05/2027"), ["2026-12-20", "2027-01-05"]);
  assert.deepStrictEqual(range("December 20, 2026 - January 5"), ["2026-12-20", "2027-01-05"]);
});

test("no year at all → closest to today, marked inferred", () => {
  const r = parse("09/24 - 10/12");
  assert.deepStrictEqual([r.start, r.end], ["2026-09-24", "2026-10-12"]);
  assert.strictEqual(r.startYearInferred, true);
  assert.strictEqual(r.endYearInferred, true);

  // Around New Year
  assert.deepStrictEqual(range("12/20 - 01/05", { today: "2027-01-02" }), ["2026-12-20", "2027-01-05"]);
  assert.deepStrictEqual(range("12/20 - 01/05", { today: "2026-12-15" }), ["2026-12-20", "2027-01-05"]);
  assert.deepStrictEqual(range("01/03 - 01/20", { today: "2026-12-28" }), ["2027-01-03", "2027-01-20"]);

  const single = parse("Released on September 02");
  assert.deepStrictEqual([single.start, single.startYearInferred], ["2026-09-02", true]);
});

test("single dates: Until → end, Arriving on → start, unlabeled → start", () => {
  assert.deepStrictEqual(range("Until September 30, 2026"), [null, "2026-09-30"]);
  assert.deepStrictEqual(range("Ends on October 8, 2026"), [null, "2026-10-08"]);
  assert.deepStrictEqual(range("Arriving on September 30, 2026"), ["2026-09-30", null]);
  assert.deepStrictEqual(range("October 21, 2026"), ["2026-10-21", null]);
  // endOnly layouts (current events listed by end date)
  assert.deepStrictEqual(range("November 1, 2026", { singleDate: "end" }), [null, "2026-11-01"]);
  assert.deepStrictEqual(range("Arriving on November 1, 2026", { singleDate: "end" }), ["2026-11-01", null]); // a label still wins
});

test("text glued together without spaces", () => {
  assert.deepStrictEqual(range("Chanson of Many WatersStart: 2026/11/04End: 2026/11/24"), ["2026-11-04", "2026-11-24"]);
  assert.deepStrictEqual(range("Event StartNovember 4, 2026Event EndDecember 16, 2026"), ["2026-11-04", "2026-12-16"]);
});

test("version references", () => {
  assert.deepStrictEqual(parse("Releases in Version 3.7").versionRef, { kind: "releases", version: "3.7" });
  assert.deepStrictEqual(parse("Releases in Version 3.7").start, null);
  assert.deepStrictEqual(parse("After Version 3.7 update").versionRef, { kind: "after", version: "3.7" });
  assert.deepStrictEqual(parse("After the Ver. 2.0 update").versionRef, { kind: "after", version: "2.0" });

  const until = parse("September 30, 2026 - Until the end of Version 3.10");
  assert.deepStrictEqual(until.versionRef, { kind: "endOf", version: "3.10" });
  assert.deepStrictEqual([until.start, until.end], ["2026-09-30", null]);

  // With a release reference, an unlabeled date is the end
  const released = parse("After Version 3.7 update - October 20, 2026");
  assert.deepStrictEqual([released.start, released.end], [null, "2026-10-20"]);
});

test("unparseable text throws SourceDateError with the exact text", () => {
  assert.throws(() => parse("22/09/2026 - 29/09/2026"), (e) => e instanceof SourceDateError && e.text === "22/09/2026 - 29/09/2026");
  assert.throws(() => parse("Coming soon"), SourceDateError);
  assert.throws(() => parse("February 30, 2026"), /not a real date/);
  assert.throws(() => parse("09/01/2026 - 09/10/2026 - 09/20/2026"), /3 dates/);
  assert.throws(() => parse("Until 09/01/2026 until 09/10/2026"), /both dates look like the end/);
});

test("fillMissingStart uses the fetch date only when the start is missing", () => {
  assert.deepStrictEqual(fillMissingStart({ start: null, end: "2026-10-10" }, { today }), {
    start: today,
    end: "2026-10-10",
    startApproximated: true,
  });
  const full = { start: "2026-10-01", end: "2026-10-10" };
  assert.strictEqual(fillMissingStart(full, { today }), full);
  const noDates = { start: null, end: null };
  assert.strictEqual(fillMissingStart(noDates, { today }), noDates);
});

test("calls don't leak state into each other (no shared /g regex)", () => {
  const { looksLikeDate, allDates } = require("../src/scraper/dates");
  assert.ok(looksLikeDate("Starts November 12, 2026 with a long text before the second date"));
  assert.deepStrictEqual(allDates("Nov. 12, 2026 - Dec. 21, 2026"), ["2026-11-12", "2026-12-21"]);
  assert.ok(looksLikeDate("Releases in Version 3.8"));
  assert.ok(!looksLikeDate("Reach Union Level 14"));
});

test("date helpers", () => {
  assert.strictEqual(addDays("2026-09-30", 42), "2026-11-11");
  assert.strictEqual(diffDays("2026-12-30", "2027-01-02"), 3);
  assert.strictEqual(toIso(2028, 2, 29), "2028-02-29");
  assert.strictEqual(toIso(2027, 2, 29), null);
});
