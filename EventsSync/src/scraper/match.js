/**
 * "Same event or two events?" for rows coming from different pages (and duplicates within one page),
 * and merging a group of matching rows into one.
 *
 * A row here is the parsed form of an extracted row:
 *   { game, kind: "event" | "banner", source: "home" | "events" | …, section, status,
 *     name, link, image, description, start, end, startYearInferred, endYearInferred, versionRef }
 */
const { diffDays, todayUtc } = require("./dates");
const { RULES } = require("./rules");

/** Words that say nothing about which event it is */
const NOISE = [/\bweb events?\b/g, /\blimited[- ]time\b/g, /\breruns?\b/g, /\bevents?\b/g];

/**
 * "3.6 Silverwing in Pursuit of the Moon Event" → "silverwing in pursuit of the moon"
 * Lowercase, quotes/dashes unified, apostrophes dropped, punctuation → spaces, leading version
 * prefix and noise words removed.
 */
function normalizeName(name) {
  let text = String(name ?? "")
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, "-")
    .trim()
    .replace(/^(?:ver(?:sion)?\.?\s*)?\d+\.\d+\s*[:\-]?\s+/, "") // "3.6 ", "Version 3.6: "
    .replace(/'/g, "");
  for (const re of NOISE) text = text.replace(re, " ");
  return text
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(name) {
  const normalized = normalizeName(name);
  return normalized ? normalized.split(" ").map(singular) : [];
}

/** "gifts" → "gift", "seas" → "sea": the pages mix singular and plural ("Gifts of Starpath" / "Gift of Starpath") */
function singular(word) {
  return word.length > 3 && word.endsWith("s") && !word.endsWith("ss") ? word.slice(0, -1) : word;
}

function jaccard(a, b) {
  const setA = new Set(a);
  const setB = new Set(b);
  const union = new Set([...setA, ...setB]).size;
  if (union === 0) return 0;
  let shared = 0;
  for (const word of setA) if (setB.has(word)) shared++;
  return shared / union;
}

/** Equal after normalizing, one contained in the other (≥ 2 words), or similar enough */
function namesMatch(a, b, rules = RULES) {
  const wa = words(a);
  const wb = words(b);
  if (wa.length === 0 || wb.length === 0) {
    // Nothing left after removing noise ("Event"): only an exact match counts
    return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
  }
  if (wa.join(" ") === wb.join(" ")) return true;

  const [shorter, longer] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  const longerSet = new Set(longer);
  if (shorter.length >= rules.matchMinContainedWords && shorter.every((w) => longerSet.has(w))) return true;

  return jaccard(wa, wb) >= rules.matchMinJaccard;
}

/**
 * Date ranges overlap (a missing side counts as open-ended), or one row has no date at all yet.
 * When both rows have a start, the starts must also be close (a rerun right after the original
 * would otherwise touch it).
 */
function datesCompatible(a, b, rules = RULES) {
  const hasDate = (r) => r.start || r.end;
  if (!hasDate(a) || !hasDate(b)) return true;

  const startA = a.start || "0000-01-01";
  const endA = a.end || "9999-12-31";
  const startB = b.start || "0000-01-01";
  const endB = b.end || "9999-12-31";
  if (startA > endB || startB > endA) return false;

  if (a.start && b.start && Math.abs(diffDays(a.start, b.start)) > rules.matchMaxStartGapDays) return false;
  return true;
}

function isSameEvent(a, b, rules = RULES) {
  if (a.game !== b.game) return false;
  if ((a.kind || "event") !== (b.kind || "event")) return false;
  return namesMatch(a.name, b.name, rules) && datesCompatible(a, b, rules);
}

/** Group rows that are the same event (transitively). Keeps the input order inside each group. */
function groupRows(rows, rules = RULES) {
  const parent = rows.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      if (isSameEvent(rows[i], rows[j], rules)) parent[find(j)] = find(i);
    }
  }
  const groups = new Map();
  rows.forEach((row, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(row);
  });
  return [...groups.values()];
}

/**
 * Pick one date for a field from a group. Explicit (year in the text) beats inferred.
 * Explicit values further apart than mergeMaxDateConflictDays are a conflict.
 */
function pickDate(group, field, rules) {
  const inferredKey = field === "start" ? "startYearInferred" : "endYearInferred";
  const withValue = group.filter((r) => r[field]);
  if (withValue.length === 0) return { value: null, inferred: false, conflict: null };

  const explicit = withValue.filter((r) => !r[inferredKey]);
  if (explicit.length === 0) return { value: withValue[0][field], inferred: true, conflict: null };

  const values = [...new Set(explicit.map((r) => r[field]))].sort();
  const spread = diffDays(values[0], values[values.length - 1]);
  const conflict = spread > rules.mergeMaxDateConflictDays ? `${field} ${values.join(" vs ")}` : null;
  return { value: explicit[0][field], inferred: false, conflict };
}

function statusFor(start, end, today, fallback) {
  if (start && start > today) return "upcoming";
  if (end && end < today) return "ended";
  if (start || end) return "ongoing";
  return fallback;
}

/**
 * Merge one group into a single row:
 *   name: longest · dates: explicit beats inferred, disagreement → conflict
 *   image: first non-empty, events page first · description: longest
 *   status: recomputed from the final dates · sources: every page/section it came from
 */
function mergeRows(group, { today = todayUtc(), rules = RULES } = {}) {
  if (group.length === 0) throw new Error("mergeRows needs at least one row");
  const eventsFirst = [...group].sort((a, b) => (a.source === "events" ? 0 : 1) - (b.source === "events" ? 0 : 1));

  const start = pickDate(group, "start", rules);
  const end = pickDate(group, "end", rules);
  const conflicts = [start.conflict, end.conflict].filter(Boolean);
  const longest = (field) =>
    group.reduce((best, r) => (String(r[field] ?? "").length > String(best ?? "").length ? r[field] : best), null);

  return {
    ...eventsFirst[0],
    name: longest("name"),
    description: longest("description"),
    image: eventsFirst.find((r) => r.image)?.image ?? null,
    link: eventsFirst.find((r) => r.link)?.link ?? null,
    start: start.value,
    end: end.value,
    startYearInferred: start.inferred,
    endYearInferred: end.inferred,
    versionRef: group.find((r) => r.versionRef)?.versionRef ?? null,
    status: statusFor(start.value, end.value, today, group[0].status),
    conflict: conflicts.length ? `pages disagree: ${conflicts.join("; ")}` : null,
    sources: group.map((r) => `${r.source}/${r.section}`),
  };
}

/** Group + merge in one go */
function mergeAll(rows, options = {}) {
  return groupRows(rows, options.rules).map((group) => mergeRows(group, options));
}

module.exports = { normalizeName, namesMatch, datesCompatible, isSameEvent, groupRows, mergeRows, mergeAll };
