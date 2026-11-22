/**
 * Event type and daily-login detection. The rule that decided is kept on the row
 * (typeReason / dailyReason), so diagnose shows why and a wrong guess is easy to override.
 *
 *   banner  from a banner section
 *   main    a "Releases in / After Version X" reference, or longer than RULES.mainMinDays
 *   side    everything else
 *
 * Daily login, first match wins:
 *   1. daily-events.json override ({ gameId, eventName, daily?: false }), eventName = case-insensitive substring
 *   2. shared name patterns   3. shared description patterns   4. the game's daily.extraPatterns
 */
const { diffDays } = require("./dates");
const { RULES } = require("./rules");

const NAME_PATTERNS = [
  /\bdaily log-?in\b/i,
  /\blog-in\b/i,
  /\blog-?in event\b/i,
  /\bsign-?in\b/i,
  /\bcheck-?in\b/i,
  /^gifts? of /i,
  /\bgift of odyssey\b/i,
];
const DESCRIPTION_PATTERNS = [
  /\blog[- ]?in (?:daily|once a day|every day|for \d+ days)\b/i,
  /\b\d+-day log-?in\b/i,
  /\blog[- ]?in for a total of \d+ days\b/i,
];

function eventType(row, rules = RULES) {
  if (row.kind === "banner") return { type: "banner", reason: "banner section" };
  const ref = row.versionRef;
  if (ref && (ref.kind === "releases" || ref.kind === "after")) return { type: "main", reason: `version-bound (${ref.kind} ${ref.version})` };
  if (row.start && row.end) {
    const days = diffDays(row.start, row.end);
    if (days > rules.mainMinDays) return { type: "main", reason: `${days} days > ${rules.mainMinDays}` };
    return { type: "side", reason: `${days} days` };
  }
  return { type: "side", reason: "no full date range" };
}

function findOverride(row, gameId, overrides) {
  const name = String(row.name).toLowerCase();
  return (overrides || []).find(
    (o) => String(o.gameId) === String(gameId) && o.eventName && name.includes(String(o.eventName).toLowerCase()),
  );
}

function dailyLogin(row, { gameId, overrides = [], extraPatterns = [] } = {}) {
  const override = findOverride(row, gameId, overrides);
  if (override) {
    const daily = override.daily !== false;
    return { daily, reason: `daily-events.json "${override.eventName}"${daily ? "" : " (forced off)"}` };
  }
  const name = String(row.name ?? "");
  const description = String(row.description ?? "");
  const byName = NAME_PATTERNS.find((re) => re.test(name));
  if (byName) return { daily: true, reason: `name ${byName}` };
  const byDescription = DESCRIPTION_PATTERNS.find((re) => re.test(description));
  if (byDescription) return { daily: true, reason: `description ${byDescription}` };
  const byGame = extraPatterns.find((re) => re.test(name) || re.test(description));
  if (byGame) return { daily: true, reason: `game pattern ${byGame}` };
  return { daily: false, reason: null };
}

/** Adds eventType, typeReason, daily, dailyReason */
function classify(row, { config, overrides, rules = RULES } = {}) {
  const type = eventType(row, rules);
  const daily = dailyLogin(row, { gameId: config?.gameId, overrides, extraPatterns: config?.daily?.extraPatterns || [] });
  return { ...row, eventType: type.type, typeReason: type.reason, daily: daily.daily, dailyReason: daily.reason };
}

module.exports = { classify, eventType, dailyLogin, NAME_PATTERNS, DESCRIPTION_PATTERNS };
