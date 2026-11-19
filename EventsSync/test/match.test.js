const test = require("node:test");
const assert = require("node:assert");
const { normalizeName, namesMatch, isSameEvent, groupRows, mergeRows, mergeAll } = require("../src/scraper/match");

const today = "2026-10-05";
const row = (overrides) => ({
  game: "gi",
  kind: "event",
  source: "home",
  section: "Current Events",
  status: "ongoing",
  name: "Test Event",
  link: null,
  image: null,
  description: "",
  start: "2026-09-24",
  end: "2026-10-12",
  startYearInferred: false,
  endYearInferred: false,
  versionRef: null,
  ...overrides,
});

test("normalizeName", () => {
  assert.strictEqual(normalizeName("3.6 Wuthering Exploration"), "wuthering exploration");
  assert.strictEqual(normalizeName("Version 7.1: Daily Login Event"), "daily login");
  assert.strictEqual(normalizeName("Limited-Time Web Event: Star’s “Echo” — Rerun"), "stars echo");
  assert.strictEqual(normalizeName("Cyber Miracle Healer, On Duty!"), "cyber miracle healer on duty");
});

test("names: equal, contained, similar", () => {
  assert.ok(namesMatch("Pursuit of the Moon", "Silverwing in Pursuit of the Moon"));
  assert.ok(namesMatch("Daily Login Event", "7.1 Daily Login"));
  assert.ok(namesMatch("Waking Moon Fishing Event", "Waking Moon Fishing Contest Event")); // 3/4 = 0.75 → containment
  // One different word only reaches Jaccard 0.8 with 8+ shared words: short names with a typo don't match
  assert.ok(!namesMatch("Phantom Shores of the Northern Sea", "Phantom Shores of the Northern Seas")); // 5/7
  assert.ok(namesMatch("A Tale of Wind and Song Under the Starry Night Sky", "A Tale of Wind and Songs Under the Starry Night Sky")); // 10/12
  assert.ok(!namesMatch("Gifts of Drifting Mist", "Gifts of Waking Moon"));
  assert.ok(!namesMatch("Moon", "Pursuit of the Moon")); // 1-word containment doesn't count
  assert.ok(!namesMatch("Event", "Login Event")); // nothing left after noise removal
});

test("plan examples (1a)", () => {
  // Same: containment + same dates (one page without a year, still the same dates)
  assert.ok(
    isSameEvent(
      row({ name: "Pursuit of the Moon", source: "events", startYearInferred: true, endYearInferred: true }),
      row({ name: "Silverwing in Pursuit of the Moon" }),
    ),
  );
  // Rerun: no overlap
  assert.ok(
    !isSameEvent(
      row({ game: "wuwa", name: "Chord Cleansing", start: "2026-09-22", end: "2026-09-29" }),
      row({ game: "wuwa", name: "Chord Cleansing", start: "2026-11-04", end: "2026-11-11" }),
    ),
  );
  // Version prefix removed, then dates decide
  assert.ok(
    !isSameEvent(
      row({ game: "wuwa", name: "3.6 Wuthering Exploration", start: "2026-09-17", end: "2026-09-29" }),
      row({ game: "wuwa", name: "3.7 Wuthering Exploration", start: "2026-09-30", end: "2026-11-11" }),
    ),
  );
  assert.ok(!isSameEvent(row({ name: "Gifts of Drifting Mist" }), row({ name: "Gifts of Waking Moon" })));
});

test("dates: open ends, version-only rows, start gap", () => {
  const full = row({ name: "Chord Cleansing", start: "2026-09-22", end: "2026-10-10" });
  assert.ok(isSameEvent(full, row({ name: "Chord Cleansing", start: null, end: "2026-10-10" }))); // "Until …"
  assert.ok(isSameEvent(full, row({ name: "Chord Cleansing", start: null, end: null, versionRef: { kind: "releases", version: "3.7" } })));
  assert.ok(isSameEvent(full, row({ name: "Chord Cleansing", start: "2026-09-25", end: "2026-10-10" }))); // 3 days (UTC-5)
  assert.ok(!isSameEvent(full, row({ name: "Chord Cleansing", start: "2026-09-26", end: "2026-10-10" }))); // 4 days
});

test("different game or kind never match", () => {
  assert.ok(!isSameEvent(row({ game: "gi" }), row({ game: "hsr" })));
  assert.ok(!isSameEvent(row({ name: "Pearl Banner", kind: "banner" }), row({ name: "Pearl Banner" })));
});

test("merge: longest name, explicit dates beat inferred, events-page image first", () => {
  const home = row({
    name: "Silverwing in Pursuit of the Moon",
    image: "https://img.example/home.png",
    description: "Short",
  });
  const events = row({
    name: "Pursuit of the Moon",
    source: "events",
    section: "Current Events",
    image: "https://img.example/events.png",
    description: "A longer description",
    start: "2025-09-24", // wrong guessed year
    startYearInferred: true,
    endYearInferred: true,
  });
  const merged = mergeRows([home, events], { today });
  assert.strictEqual(merged.name, "Silverwing in Pursuit of the Moon");
  assert.strictEqual(merged.start, "2026-09-24");
  assert.strictEqual(merged.startYearInferred, false);
  assert.strictEqual(merged.image, "https://img.example/events.png");
  assert.strictEqual(merged.description, "A longer description");
  assert.strictEqual(merged.status, "ongoing");
  assert.strictEqual(merged.conflict, null);
  assert.deepStrictEqual(merged.sources, ["home/Current Events", "events/Current Events"]);
});

test("merge: status is recomputed, a missing image falls back", () => {
  const merged = mergeRows(
    [row({ status: "ongoing", start: "2026-10-08", end: "2026-10-20", image: "https://img.example/a.png" }), row({ source: "events", status: "upcoming", start: "2026-10-08", end: "2026-10-20" })],
    { today },
  );
  assert.strictEqual(merged.status, "upcoming");
  assert.strictEqual(merged.image, "https://img.example/a.png");
});

test("merge: explicit dates that disagree are a conflict", () => {
  const merged = mergeRows([row({ end: "2026-10-12" }), row({ source: "events", end: "2026-10-20" })], { today });
  assert.strictEqual(merged.conflict, "pages disagree: end 2026-10-12 vs 2026-10-20");
});

test("groupRows / mergeAll", () => {
  const rows = [
    row({ name: "Pursuit of the Moon", source: "events" }),
    row({ name: "Gifts of Drifting Mist", start: "2026-09-30", end: "2026-10-14" }),
    row({ name: "Silverwing in Pursuit of the Moon" }),
    row({ name: "Gifts of Drifting Mist", source: "events", start: "2026-09-30", end: "2026-10-14" }),
  ];
  assert.deepStrictEqual(groupRows(rows).map((g) => g.length), [2, 2]);
  assert.deepStrictEqual(mergeAll(rows, { today }).map((r) => r.name), ["Silverwing in Pursuit of the Moon", "Gifts of Drifting Mist"]);
});
