/**
 * Every date format the source uses → "YYYY-MM-DD".
 *
 * parseDateText(text, { today, singleDate: "start" | "end" }) → {
 *   start, end,                       "YYYY-MM-DD" or null
 *   startYearInferred, endYearInferred  true when the year wasn't in the text and was guessed from today
 *   versionRef                        { kind: "releases" | "after" | "endOf", version: "3.7" } or null
 * }
 *
 * Dates are calendar dates in server time. Clock times and region notes ("(UTC-5)", "(Server Time)")
 * are dropped: the app applies the region reset time on top. Day/month order is always US (MM/DD).
 */
const { SourceDateError } = require("./errors");

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const MONTH_NAME =
  "(?<mon>jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sept?(?:ember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";

/** One date, in any supported format. Order matters: the most specific format first. */
const DATE_TOKEN_SOURCE = new RegExp(
  [
    "(?<ymd>\\b(?<y1>\\d{4})[/.-](?<m1>\\d{1,2})[/.-](?<d1>\\d{1,2})\\b)", // 2026/09/23, 2026-09-23
    "(?<mdy>\\b(?<m2>\\d{1,2})/(?<d2>\\d{1,2})/(?<y2>\\d{4}|\\d{2})\\b)", // 09/24/2026, 08/26/26
    "(?<md>\\b(?<m3>\\d{1,2})/(?<d3>\\d{1,2})\\b(?!/))", //                  09/24
    `(?<named>\\b${MONTH_NAME}\\s+(?<d4>\\d{1,2})\\b(?:,?\\s*(?<y4>\\d{4})\\b)?)`, // September 9, 2026 / Sept. 24 / Aug 20
  ].join("|"),
  "i",
).source;

/** A fresh global regex each time: a shared /g regex keeps lastIndex between calls and skips dates */
const dateTokens = (text) => String(text).matchAll(new RegExp(DATE_TOKEN_SOURCE, "gi"));
const firstDateToken = (text) => new RegExp(DATE_TOKEN_SOURCE, "i").exec(String(text));

const VERSION = "(?:the\\s+)?(?:ver(?:sion)?\\.?\\s*)?(\\d+\\.\\d+)";
/** Version-relative dates, checked in this order */
const VERSION_REFS = [
  { kind: "endOf", re: new RegExp(`\\b(?:until\\s+|till\\s+)?(?:the\\s+)?end\\s+of\\s+${VERSION}`, "i") },
  { kind: "after", re: new RegExp(`\\bafter\\s+${VERSION}(?:\\s+version)?\\s+update\\b`, "i") },
  { kind: "after", re: /\bafter\s+(?:the\s+)?ver(?:sion)?\.?\s*(\d+\.\d+)/i },
  {
    kind: "releases",
    re: new RegExp(`\\b(?:releases?|released|arriv(?:es|ing)|coming|available)\\s+(?:in|with|on)\\s+${VERSION}`, "i"),
  },
];

/** Words in front of a date saying which end of the range it is. The last one before the date wins. */
const START_LABEL = /\b(?:start(?:s|ing)?|from|begins?|arriv(?:es|ing)|releas(?:es|ed|ing)|available|opens?)\b/gi;
const END_LABEL = /\b(?:end(?:s|ing)?|until|till|through|to|expires?|closes?)\b/gi;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Today's date in UTC, "YYYY-MM-DD" */
function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

/** (2026, 9, 3) → "2026-09-03", or null if that day doesn't exist */
function toIso(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date.toISOString().slice(0, 10);
}

function isoToMs(iso) {
  return Date.parse(`${iso}T00:00:00Z`);
}

/** "2026-09-30" + 42 → "2026-11-11" */
function addDays(iso, days) {
  return new Date(isoToMs(iso) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Days from a to b (positive when b is later) */
function diffDays(a, b) {
  return Math.round((isoToMs(b) - isoToMs(a)) / DAY_MS);
}

/** Of last year, this year and next year, the year that puts month/day closest to today */
function closestYear(month, day, today) {
  const thisYear = Number(today.slice(0, 4));
  let best = null;
  for (const year of [thisYear - 1, thisYear, thisYear + 1]) {
    const iso = toIso(year, month, day);
    if (!iso) continue; // Feb 29 in a non-leap year
    const distance = Math.abs(diffDays(today, iso));
    if (!best || distance < best.distance) best = { year, distance };
  }
  return best ? best.year : null;
}

/** Drop clock times, region notes and ordinal suffixes, unify dashes */
function normalize(text) {
  return String(text)
    .replace(/ /g, " ")
    .replace(/[–—~〜]/g, " - ")
    .replace(/\(([^)]*)\)/g, (whole, inner) => {
      return firstDateToken(inner) ? ` ${inner} ` : " "; // "(Sept. 24, 2026)" keeps its date, "(UTC-5)" goes
    })
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?/gi, " ")
    .replace(/\b(?:utc|gmt)\s*[+-]\s*\d{1,2}(?::?\d{2})?\b/gi, " ")
    .replace(/\bserver\s+time\b/gi, " ")
    .replace(/\b(\d{1,2})(?:st|nd|rd|th)\b/gi, "$1")
    // Cell text glued together: "WatersStart: 2026/11/04End: …" → "Waters Start: 2026/11/04 End: …"
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/(\d)([A-Za-z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
}

function findVersionRef(text) {
  for (const { kind, re } of VERSION_REFS) {
    const match = re.exec(text);
    if (match) return { ref: { kind, version: match[1] }, text: text.replace(match[0], " ") };
  }
  return { ref: null, text };
}

/** "start" / "end" / null: the last label word in the text in front of a date */
function labelIn(segment) {
  const last = (re) => {
    let index = -1;
    for (const match of segment.matchAll(re)) index = match.index;
    return index;
  };
  const startAt = last(START_LABEL);
  const endAt = last(END_LABEL);
  if (startAt < 0 && endAt < 0) return null;
  return startAt > endAt ? "start" : "end";
}

function readToken(match, original) {
  const g = match.groups;
  let year = null;
  let month;
  let day;
  if (g.ymd) [year, month, day] = [g.y1, g.m1, g.d1].map(Number);
  else if (g.mdy) {
    [month, day, year] = [g.m2, g.d2, g.y2].map(Number);
    if (g.y2.length === 2) year += 2000;
  } else if (g.md) [month, day] = [g.m3, g.d3].map(Number);
  else {
    month = MONTHS[g.mon.toLowerCase().slice(0, 3)];
    day = Number(g.d4);
    if (g.y4) year = Number(g.y4);
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new SourceDateError(`"${match[0]}" is not a MM/DD date`, original);
  }
  return { year, month, day, text: match[0] };
}

function finish(part, original) {
  const iso = toIso(part.year, part.month, part.day);
  if (!iso) throw new SourceDateError(`"${part.text}" is not a real date`, original);
  return iso;
}

/** Month/day of a is after month/day of b (ignoring years) */
function laterInYear(a, b) {
  return a.month * 100 + a.day > b.month * 100 + b.day;
}

/**
 * Fill in missing years. A year from the same range is reliable; only a year guessed from today
 * counts as inferred.
 */
function completeYears(start, end, today) {
  const inferred = { start: false, end: false };
  if (start && end) {
    if (start.year == null && end.year != null) {
      start.year = laterInYear(start, end) ? end.year - 1 : end.year; // "12/20 - 01/05/2027"
    } else if (end.year == null && start.year != null) {
      end.year = laterInYear(start, end) ? start.year + 1 : start.year;
    } else if (start.year == null && end.year == null) {
      start.year = closestYear(start.month, start.day, today);
      end.year = laterInYear(start, end) ? start.year + 1 : start.year;
      inferred.start = inferred.end = true;
    }
  } else {
    const only = start || end;
    if (only && only.year == null) {
      only.year = closestYear(only.month, only.day, today);
      inferred[start ? "start" : "end"] = true;
    }
  }
  return inferred;
}

/**
 * Parse a date cell. Throws SourceDateError when the text has no date and no version reference,
 * more than two dates, or a date that doesn't exist.
 */
function parseDateText(dateText, { today = todayUtc(), singleDate = "start" } = {}) {
  const original = String(dateText ?? "");
  const { ref: versionRef, text } = findVersionRef(normalize(original));

  const tokens = [];
  let previousEnd = 0;
  for (const match of dateTokens(text)) {
    const token = readToken(match, original);
    token.label = labelIn(text.slice(previousEnd, match.index));
    tokens.push(token);
    previousEnd = match.index + match[0].length;
  }

  if (tokens.length > 2) throw new SourceDateError(`found ${tokens.length} dates, expected at most 2`, original);
  if (tokens.length === 0 && !versionRef) throw new SourceDateError("can't parse", original);

  let start = null;
  let end = null;
  if (tokens.length === 2) {
    const [a, b] = tokens;
    const roleA = a.label || "start";
    const roleB = b.label || (roleA === "start" ? "end" : "start");
    if (roleA === roleB) throw new SourceDateError(`both dates look like the ${roleA} date`, original);
    ({ start, end } = roleA === "start" ? { start: a, end: b } : { start: b, end: a });
  } else if (tokens.length === 1) {
    const [only] = tokens;
    // A version reference fills one side, so an unlabeled date is the other one. Without one, the
    // section's layout decides (endOnly sections list current events by their end date).
    const fallback = versionRef ? (versionRef.kind === "endOf" ? "start" : "end") : singleDate;
    if ((only.label || fallback) === "start") start = only;
    else end = only;
  }

  const inferred = completeYears(start, end, today);
  return {
    start: start ? finish(start, original) : null,
    end: end ? finish(end, original) : null,
    startYearInferred: inferred.start,
    endYearInferred: inferred.end,
    versionRef,
  };
}

/** Does this text contain something parseDateText could read (a date or a version reference)? */
function looksLikeDate(text) {
  const normalized = normalize(text);
  return Boolean(firstDateToken(normalized)) || VERSION_REFS.some(({ re }) => re.test(normalized));
}

/**
 * A server-time row like "November 4, 2026 7:00 AM~12:00 PM (UTC/GMT+8)" →
 *   { date: "2026-11-04", times: ["2026-11-03T23:00:00Z", "2026-11-04T04:00:00Z"] }
 * The date is the local date in the text. Times are converted to UTC with the offset in the text;
 * without an offset there are no times. A second time earlier than the first is on the next day.
 */
function parseServerTime(text) {
  const normalizedDate = normalize(text);
  const match = firstDateToken(normalizedDate);
  if (!match) return null;
  const part = readToken(match, text);
  if (part.year == null) return null;
  const date = toIso(part.year, part.month, part.day);
  if (!date) return null;

  const offset = /\b(?:UTC|GMT)(?:\/GMT)?\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?/i.exec(text);
  if (!offset) return { date, times: [] };
  const offsetMinutes = (offset[1] === "-" ? -1 : 1) * (Number(offset[2]) * 60 + Number(offset[3] || 0));

  const times = [];
  let previous = null;
  for (const t of String(text).matchAll(/\b(\d{1,2}):(\d{2})\s*([AP])\.?M\.?/gi)) {
    let hours = Number(t[1]) % 12;
    if (t[3].toUpperCase() === "P") hours += 12;
    let ms = Date.UTC(part.year, part.month - 1, part.day, hours, Number(t[2])) - offsetMinutes * 60_000;
    if (previous != null && ms <= previous) ms += DAY_MS;
    previous = ms;
    times.push(new Date(ms).toISOString().replace(".000Z", "Z"));
  }
  return { date, times };
}

/** Every full date (with a year) in the text, in order */
function allDates(text) {
  const out = [];
  for (const match of dateTokens(normalize(text))) {
    const part = readToken(match, text);
    if (part.year != null) {
      const iso = toIso(part.year, part.month, part.day);
      if (iso) out.push(iso);
    }
  }
  return out;
}

/**
 * An event listed as current with only an end date ("Until October 10") has already started:
 * use the fetch date as its start. Run after matching, so a start from the other page wins.
 */
function fillMissingStart(row, { today = todayUtc() } = {}) {
  if (row.start || !row.end) return row;
  return { ...row, start: today, startApproximated: true };
}

module.exports = {
  parseDateText,
  fillMissingStart,
  looksLikeDate,
  parseServerTime,
  allDates,
  toIso,
  addDays,
  diffDays,
  todayUtc,
  closestYear,
};
