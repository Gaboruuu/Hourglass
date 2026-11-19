/**
 * Every tunable threshold of the scraper in one place, so the shadow run can adjust them
 * without touching the logic.
 */
const RULES = Object.freeze({
  /** Two rows with full start dates are only the same event if their starts are at most this far apart (region differences) */
  matchMaxStartGapDays: 3,
  /** A name contained in another one only counts as a match when it has at least this many words */
  matchMinContainedWords: 2,
  /** Word-set (Jaccard) similarity at or above which two names match */
  matchMinJaccard: 0.8,
  /** Explicit dates of matched rows that differ by more than this are a conflict */
  mergeMaxDateConflictDays: 3,

  /** A date whose year was guessed must be within this many days of today (validation, 1c) */
  inferredYearMaxDays: 120,
  /** Any date further than this from today is implausible (validation, 1c) */
  plausibleMaxDays: 365,

  /** Events longer than this are "main" (classification, 1c) */
  mainMinDays: 30,
  /** Version length used to estimate an end date when the next version isn't dated yet */
  defaultCadenceDays: 42,
});

module.exports = { RULES };
