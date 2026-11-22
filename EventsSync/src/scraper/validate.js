/**
 * Quality rules for a finished row. Every row ends up with an outcome:
 *
 *   valid    goes to the DB check
 *   pending  expected to resolve on a later run (a version not dated yet, an estimated end)
 *   invalid  needs a look (shown in the report and in invalid-events.json)
 *   dropped  silently skipped, only counted (ended / stale rows, ignored-events.json)
 *
 * Rules run in this order; the first one that applies decides.
 */
const { diffDays } = require("./dates");
const { RULES } = require("./rules");

function isIgnored(row, gameId, ignored) {
  const name = String(row.name ?? "").toLowerCase();
  return (ignored || []).find(
    (entry) => String(entry.gameId) === String(gameId) && entry.eventName && name.includes(String(entry.eventName).toLowerCase()),
  );
}

/** → { outcome, reason } */
function validateRow(row, { today, gameId, ignored = [], rules = RULES }) {
  const name = String(row.name ?? "").trim();
  const ignore = isIgnored(row, gameId, ignored);

  if (ignore) return { outcome: "dropped", reason: `ignored (${ignore.reason || ignore.eventName})` };
  if (row.dateError) return { outcome: "invalid", reason: `can't read the date: ${row.dateError}` };
  if (!name || name.length > 255) return { outcome: "invalid", reason: "bad name" };
  // Stale rows the source forgot to remove: nothing to look at, even if they're messy
  if (row.end && row.end < today && !row.endEstimated) return { outcome: "dropped", reason: "ended" };
  if (row.conflict) return { outcome: "invalid", reason: row.conflict };
  if (row.unresolved) return { outcome: "pending", reason: row.unresolved };
  if (row.endEstimated) return { outcome: "pending", reason: `estimated end (Version ${row.versionRef?.version})` };
  if (!row.start && !row.end) return { outcome: "invalid", reason: "missing start/end" };
  if (!row.end) return { outcome: "invalid", reason: "no end date" };
  if (!row.start) return { outcome: "invalid", reason: "no start date" };
  if (row.start > row.end) return { outcome: "invalid", reason: "start after end" };

  for (const field of ["start", "end"]) {
    const distance = Math.abs(diffDays(today, row[field]));
    if (distance > rules.plausibleMaxDays) return { outcome: "invalid", reason: `implausible date (${field} ${row[field]}, source typo?)` };
    const inferred = field === "start" ? row.startYearInferred : row.endYearInferred;
    if (inferred && distance > rules.inferredYearMaxDays) {
      return { outcome: "invalid", reason: `implausible date (${field} ${row[field]}, year guessed)` };
    }
  }
  return { outcome: "valid", reason: null };
}

module.exports = { validateRow, isIgnored };
