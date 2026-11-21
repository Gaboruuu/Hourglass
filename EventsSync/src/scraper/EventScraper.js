/**
 * The whole pipeline for one game:
 *
 *   fetch + extract (fetchRaw) → parse dates → merge same events → resolve version references
 *   → fill missing starts → classify → validate → DB-shaped rows
 *
 * Nothing here talks to the backend. collect() returns every stage, so diagnose can show
 * exactly where a row went wrong, and sync.js (1e) only uses `valid`.
 */
const { fetchRaw } = require("./fetchRaw");
const { parseDateText, fillMissingStart, todayUtc } = require("./dates");
const { mergeAll } = require("./match");
const { resolveVersionRef, pickCurrentAndNext } = require("./versions");
const { classify } = require("./classify");
const { validateRow } = require("./validate");
const { createClient } = require("./client");
const { RULES } = require("./rules");
const { loadIgnoredEvents, loadDailyEvents } = require("../utils/eventFilters");

/** A raw row with its date text parsed. A date the parser doesn't understand is kept, marked dateError */
function parseRow(row, today) {
  try {
    return { ...row, ...parseDateText(row.dateText, { today, singleDate: row.singleDate }), dateError: null };
  } catch (error) {
    return { ...row, start: null, end: null, startYearInferred: false, endYearInferred: false, versionRef: null, dateError: error.message };
  }
}

/** The row the backend stores (POST /events) */
function toDbRow(row, gameId) {
  return {
    game_id: gameId,
    event_name: row.name.trim(),
    start_date: row.start,
    expiry_date: row.end,
    daily_login: row.daily ? 1 : 0,
    event_type: row.eventType,
    background_url: row.image || null,
  };
}

class EventScraper {
  /**
   * @param config   a games/<game>.js config
   * @param options  { client, today, rules, ignored, dailyOverrides } — all optional, for tests
   */
  constructor(config, { client = createClient(), today = todayUtc(), rules = RULES, ignored, dailyOverrides } = {}) {
    this.config = config;
    this.client = client;
    this.today = today;
    this.rules = rules;
    this.ignored = ignored ?? loadIgnoredEvents();
    this.dailyOverrides = dailyOverrides ?? loadDailyEvents();
  }

  async collect() {
    const { config, today, rules } = this;
    const requestsBefore = this.client.requests; // the client may be shared by several games
    const raw = await fetchRaw(config, this.client, { today });

    const parsed = raw.rows.map((row) => parseRow(row, today));
    const unreadable = parsed.filter((r) => r.dateError);
    const merged = mergeAll(
      parsed.filter((r) => !r.dateError),
      { today, rules },
    );

    const versionInfo = pickCurrentAndNext(raw.versions, { today });
    const rows = [...merged, ...unreadable].map((row) => {
      let r = resolveVersionRef(row, raw.versions, { cadenceDays: config.version?.cadenceDays ?? rules.defaultCadenceDays });
      r = fillMissingStart(r, { today });
      r = classify(r, { config, overrides: this.dailyOverrides, rules });
      const { outcome, reason } = validateRow(r, { today, gameId: config.gameId, ignored: this.ignored, rules });
      return { ...r, outcome, reason };
    });

    const by = (outcome) => rows.filter((r) => r.outcome === outcome);
    const valid = by("valid");
    return {
      game: config.key,
      gameId: config.gameId,
      today,
      pages: raw.pages,
      versions: raw.versions,
      currentVersion: versionInfo.current,
      nextVersion: versionInfo.next,
      raw: raw.rows,
      rows,
      valid: valid.map((r) => toDbRow(r, config.gameId)),
      pending: by("pending"),
      invalid: by("invalid"),
      dropped: by("dropped"),
      warnings: raw.warnings,
      requests: this.client.requests - requestsBefore,
      counts: {
        raw: raw.rows.length,
        merged: rows.length,
        valid: valid.length,
        pending: by("pending").length,
        invalid: by("invalid").length,
        dropped: by("dropped").length,
        withoutImage: valid.filter((r) => !r.image).length,
      },
    };
  }
}

module.exports = { EventScraper, toDbRow, parseRow };
