const test = require("node:test");
const assert = require("node:assert");
const { readVersionPage, collectVersions } = require("../src/scraper/versionPage");
const { parseServerTime } = require("../src/scraper/dates");
const { fixture } = require("./helpers");

test("parseServerTime: local date, times converted to UTC, maintenance window", () => {
  assert.deepStrictEqual(parseServerTime("November 4, 2026 7:00 AM~12:00 PM (UTC/GMT+8)"), {
    date: "2026-11-04",
    times: ["2026-11-03T23:00:00Z", "2026-11-04T04:00:00Z"],
  });
  assert.deepStrictEqual(parseServerTime("November 10, 2026 10:00 PM (UTC/GMT-5)"), { date: "2026-11-10", times: ["2026-11-11T03:00:00Z"] });
  assert.deepStrictEqual(parseServerTime("December 31, 2026 11:00 PM~1:00 AM (UTC+1)").times, ["2026-12-31T22:00:00Z", "2027-01-01T00:00:00Z"]);
  assert.deepStrictEqual(parseServerTime("November 4, 2026"), { date: "2026-11-04", times: [] });
  assert.strictEqual(parseServerTime("no date here"), null);
});

test("server table: release = end of maintenance, every server agrees", () => {
  const config = { release: [{ heading: /^Released on /i }], releaseTime: "serverTable" };
  const info = readVersionPage(fixture("version-server-table.html"), config, { version: "4.2", url: "u" });
  assert.deepStrictEqual(info, {
    version: "4.2",
    url: "u",
    releaseDate: "2026-11-04",
    endDate: null,
    releaseAt: "2026-11-04T04:00:00Z",
    maintenanceStartAt: "2026-11-03T23:00:00Z",
    teaser: false,
    warnings: [],
  });
});

test("release row with NA and EU/Asia dates → the later (server) date", () => {
  const config = { release: [{ row: /^Release Date$/i }], releaseTime: "serverTable" };
  const info = readVersionPage(fixture("version-release-row.html"), config, { version: "4.7" });
  assert.strictEqual(info.releaseDate, "2026-11-11");
  assert.strictEqual(info.releaseAt, "2026-11-11T03:00:00Z");
  assert.strictEqual(info.maintenanceStartAt, null);
});

test("schedule row gives release + end date; release time from a sentence", () => {
  const config = {
    release: [{ schedule: /^Ver(?:sion|\.)\s*\d+\.\d+ Schedule$/i }],
    releaseTime: { text: /maintenance period that ends at (\d{1,2}:\d{2}\s*[AP]M)\s*\((UTC\s*[+-]\s*\d{1,2})\)/i },
  };
  const info = readVersionPage(fixture("version-schedule.html"), config, { version: "3.8" });
  assert.strictEqual(info.releaseDate, "2026-11-12");
  assert.strictEqual(info.endDate, "2026-12-21");
  assert.strictEqual(info.releaseAt, "2026-11-12T03:00:00Z");

  // A teaser page quoting another version's schedule is not dated by it
  const teaser = readVersionPage(fixture("version-teaser.html"), config, { version: "4.0" });
  assert.strictEqual(teaser.releaseDate, null);
  assert.strictEqual(teaser.teaser, true);
});

test("first rule with a date wins; missing times only warn", () => {
  const config = { release: [{ row: /^Nope$/ }, { heading: /Released on /i }], releaseTime: "serverTable" };
  const info = readVersionPage(fixture("version-schedule.html"), config, { version: "3.8" });
  assert.strictEqual(info.releaseDate, "2026-11-12");
  assert.strictEqual(info.releaseAt, null);
  assert.deepStrictEqual(info.warnings, ["release time: no server time rows found"]);
});

test("collectVersions: newest first, stops at the first released version", async () => {
  const pages = {
    "https://x/4.0": fixture("version-teaser.html"),
    "https://x/3.8": fixture("version-schedule.html"),
    "https://x/3.7": "should not be fetched",
  };
  const fetched = [];
  const client = { get: async (url) => (fetched.push(url), pages[url]) };
  const config = { version: { release: [{ schedule: /^Ver(?:sion|\.)\s*\d+\.\d+ Schedule$/i }], releaseTime: null } };
  const links = ["4.0", "3.8", "3.7"].map((version) => ({ version, url: `https://x/${version}` }));

  const { versions, warnings } = await collectVersions(config, client, links, { today: "2026-11-19" });
  assert.deepStrictEqual(fetched, ["https://x/4.0", "https://x/3.8"]);
  assert.deepStrictEqual(versions.map((v) => [v.version, v.releaseDate, v.teaser]), [["4.0", null, true], ["3.8", "2026-11-12", false]]);
  assert.deepStrictEqual(warnings, []);

  const none = await collectVersions(config, client, links.slice(0, 1), { today: "2026-11-19" });
  assert.match(none.warnings[0], /no released version found/);
});
