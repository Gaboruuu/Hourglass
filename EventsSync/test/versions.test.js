const test = require("node:test");
const assert = require("node:assert");
const {
  parseVersion,
  compareVersions,
  sortVersions,
  pickCurrentAndNext,
  resolveVersionRef,
} = require("../src/scraper/versions");

test("versions compare as integer tuples", () => {
  assert.deepStrictEqual(parseVersion("3.10"), [3, 10]);
  assert.deepStrictEqual(parseVersion("2.0"), [2, 0]);
  assert.strictEqual(parseVersion("Version 2"), null);
  assert.ok(compareVersions("3.10", "3.9") > 0);
  assert.ok(compareVersions("4.0", "3.8") > 0);
  assert.strictEqual(compareVersions("2.0", "2.0"), 0);
  assert.deepStrictEqual(
    sortVersions([{ version: "3.10" }, { version: "3.9" }, { version: "2.0" }, { version: "junk" }]).map((v) => v.version),
    ["2.0", "3.9", "3.10"],
  );
});

test("sortVersions keeps the dated copy of a duplicate", () => {
  const sorted = sortVersions([{ version: "3.7", releaseDate: null }, { version: "3.7", releaseDate: "2026-09-30" }]);
  assert.deepStrictEqual(sorted, [{ version: "3.7", releaseDate: "2026-09-30" }]);
});

test("current and next version", () => {
  const versions = [
    { version: "3.6", releaseDate: "2026-08-20" },
    { version: "3.7", releaseDate: "2026-09-30" },
    { version: "3.8", releaseDate: "2026-11-11" },
    { version: "3.9", releaseDate: null }, // teaser
  ];
  const { current, next } = pickCurrentAndNext(versions, { today: "2026-10-05" });
  assert.strictEqual(current.version, "3.7");
  assert.strictEqual(next.version, "3.8");

  // Release day counts as current
  assert.strictEqual(pickCurrentAndNext(versions, { today: "2026-11-11" }).current.version, "3.8");
  // Next not announced yet
  assert.strictEqual(pickCurrentAndNext(versions.slice(0, 2), { today: "2026-10-05" }).next, null);
});

const versions = [
  { version: "3.7", releaseDate: "2026-09-30" },
  { version: "3.8", releaseDate: "2026-11-11" },
];

test("Releases in / After Version X → start = release date of X", () => {
  const row = { start: null, end: "2026-12-01", versionRef: { kind: "releases", version: "3.8" } };
  assert.deepStrictEqual(resolveVersionRef(row, versions), {
    ...row,
    start: "2026-11-11",
    startYearInferred: false,
    unresolved: null,
  });

  const after = { start: null, end: null, versionRef: { kind: "after", version: "3.9" } };
  assert.strictEqual(resolveVersionRef(after, versions).unresolved, "version 3.9 not dated yet");
});

test("explicit dates on the row are kept", () => {
  const row = { start: "2026-11-12", end: "2026-12-01", versionRef: { kind: "after", version: "3.8" } };
  assert.strictEqual(resolveVersionRef(row, versions).start, "2026-11-12");
});

test("Until the end of Version X → end = release date of the next version", () => {
  const row = { start: "2026-09-30", end: null, versionRef: { kind: "endOf", version: "3.7" } };
  const resolved = resolveVersionRef(row, versions);
  assert.strictEqual(resolved.end, "2026-11-11");
  assert.strictEqual(resolved.endEstimated, undefined);

  // The next version isn't arithmetic: 3.8 → 4.0
  const hsr = [
    { version: "3.8", releaseDate: "2026-01-14" },
    { version: "4.0", releaseDate: "2026-02-25" },
  ];
  assert.strictEqual(resolveVersionRef({ ...row, versionRef: { kind: "endOf", version: "3.8" } }, hsr).end, "2026-02-25");
});

test("end of Version X with the next version not dated → estimate, marked", () => {
  const row = { start: "2026-11-11", end: null, versionRef: { kind: "endOf", version: "3.8" } };
  const resolved = resolveVersionRef(row, [...versions, { version: "3.9", releaseDate: null }]);
  assert.strictEqual(resolved.end, "2026-12-23"); // 2026-11-11 + 42
  assert.strictEqual(resolved.endEstimated, true);
  assert.strictEqual(resolved.unresolved, null);

  const custom = resolveVersionRef(row, versions, { cadenceDays: 35 });
  assert.strictEqual(custom.end, "2026-12-16");

  const unknown = resolveVersionRef({ ...row, versionRef: { kind: "endOf", version: "4.0" } }, versions);
  assert.strictEqual(unknown.end, null);
  assert.strictEqual(unknown.unresolved, "version 4.0 not dated yet");
});

test("rows without a version reference are returned untouched", () => {
  const row = { start: "2026-10-01", end: "2026-10-10", versionRef: null };
  assert.strictEqual(resolveVersionRef(row, versions), row);
});
