/**
 * Version logic (1a): comparing version numbers, picking the current/next version, and resolving
 * version-relative dates ("until the end of Version 3.7"). Reading version pages comes in 1b.
 *
 * A version is { version: "3.7", releaseDate: "2026-09-30" | null }.
 */
const { addDays } = require("./dates");
const { RULES } = require("./rules");

/** "3.10" → [3, 10]; anything that isn't "<int>.<int>[.<int>]" → null */
function parseVersion(text) {
  const match = /^\s*v?(\d+(?:\.\d+){1,2})\s*$/i.exec(String(text ?? ""));
  return match ? match[1].split(".").map(Number) : null;
}

/**
 * Compare as integer tuples: "3.10" > "3.9", "2.0" == "2.0" (never turned into "2").
 * Returns < 0, 0 or > 0. Unparseable versions sort first.
 */
function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  if (!pa || !pb) return (pa ? 1 : 0) - (pb ? 1 : 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Valid, de-duplicated versions, oldest first. A dated entry wins over an undated duplicate. */
function sortVersions(versions) {
  const byVersion = new Map();
  for (const v of versions) {
    if (!parseVersion(v.version)) continue;
    const key = parseVersion(v.version).join(".");
    const known = byVersion.get(key);
    if (!known || (!known.releaseDate && v.releaseDate)) byVersion.set(key, { ...v });
  }
  return [...byVersion.values()].sort((a, b) => compareVersions(a.version, b.version));
}

/**
 * current = the highest version released on or before today
 * next    = the lowest dated version after it, released after today (announced)
 * Versions without a release date (teaser pages) are ignored.
 */
function pickCurrentAndNext(versions, { today }) {
  const dated = sortVersions(versions).filter((v) => v.releaseDate);
  const released = dated.filter((v) => v.releaseDate <= today);
  const current = released.length ? released[released.length - 1] : null;
  const next =
    dated.find((v) => v.releaseDate > today && (!current || compareVersions(v.version, current.version) > 0)) ||
    null;
  return { current, next };
}

/** The release date of exactly this version, or null */
function releaseDateOf(versions, version) {
  const found = versions.find((v) => compareVersions(v.version, version) === 0 && v.releaseDate);
  return found ? found.releaseDate : null;
}

/**
 * The version that comes after `version`, from the known list (not arithmetic: HSR goes 3.8 → 4.0).
 * Only dated versions count, so the result is the next one we can actually use.
 */
function nextDatedVersion(versions, version) {
  return sortVersions(versions).find((v) => v.releaseDate && compareVersions(v.version, version) > 0) || null;
}

/**
 * Fill in the dates a version reference stands for. Explicit dates already on the row are kept.
 *
 *   releases / after X  → start = release date of X
 *   endOf X             → end   = release date of the next version after X;
 *                         if that isn't announced: release date of X + cadenceDays, endEstimated: true
 *
 * Returns the row with `unresolved` set to a reason when the reference can't be resolved yet
 * (it becomes "pending" in validation and is retried on the next run).
 */
function resolveVersionRef(row, versions, { cadenceDays = RULES.defaultCadenceDays } = {}) {
  const ref = row.versionRef;
  if (!ref) return row;
  const resolved = { ...row, unresolved: null };
  const releaseOfRef = releaseDateOf(versions, ref.version);

  if (ref.kind === "releases" || ref.kind === "after") {
    if (!resolved.start) {
      if (releaseOfRef) {
        resolved.start = releaseOfRef;
        resolved.startYearInferred = false;
      } else resolved.unresolved = `version ${ref.version} not dated yet`;
    }
    return resolved;
  }

  if (ref.kind === "endOf" && !resolved.end) {
    const next = nextDatedVersion(versions, ref.version);
    if (next) {
      resolved.end = next.releaseDate;
      resolved.endYearInferred = false;
    } else if (releaseOfRef) {
      resolved.end = addDays(releaseOfRef, cadenceDays);
      resolved.endYearInferred = false;
      resolved.endEstimated = true;
    } else {
      resolved.unresolved = `version ${ref.version} not dated yet`;
    }
  }
  return resolved;
}

module.exports = {
  parseVersion,
  compareVersions,
  sortVersions,
  pickCurrentAndNext,
  releaseDateOf,
  nextDatedVersion,
  resolveVersionRef,
};
