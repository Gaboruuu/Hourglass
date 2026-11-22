/**
 * One sync run, every dependency injected (sync.js wires the real ones, tests pass fakes).
 *
 * Per game, the config's `live` flag says who writes to the DB:
 *   live: true    the scraper's valid events are inserted (the old source isn't run)
 *   live: false   shadow mode: the old source (legacy/) inserts as before; the scraper runs too,
 *                 and its results only go into the report, next to the old source's
 *
 * Steps: every game (a failing source never stops the others) → aliases → backend rules →
 * one batch-check (chunked) for everything → insert the new ones (skipped with dryRun).
 */
const { filterBackendValid } = require("../services/eventValidation");
const { saveInvalidEvents } = require("../utils/eventFilters");
const { applyAliases, forBackend } = require("./aliases");
const { compareSources } = require("./compare");

/** Same key as the backend's batch-check (it trims names) */
const keyOf = (e) => `${e.game_id}|${String(e.event_name).trim()}|${e.start_date}`;

/**
 * @param options.games          game configs to sync (enabled ones)
 * @param options.scrape(config) → EventScraper.collect() result
 * @param options.legacyFetch(config) → old-source events (DB shape), for games that aren't live
 * @param options.backend        { batchCheck(events), createEvent(event) }
 * @param options.aliases        event-aliases.json entries
 * @param options.dryRun         check everything, insert nothing
 * @param options.invalidEventsPath  where pending/invalid/rejected events are written
 */
async function runSync({ games, scrape, legacyFetch, backend, aliases = [], dryRun = false, invalidEventsPath, today, log = () => {} }) {
  const failures = [];
  const perGame = [];

  // 1. Collect every game before touching the DB
  for (const config of games) {
    const entry = { game: config.key, gameId: config.gameId, live: Boolean(config.live), scraper: null, legacy: null };
    perGame.push(entry);

    log(`${config.key}: scraping…`);
    try {
      entry.scraper = await scrape(config);
      entry.scraperRows = applyAliases(entry.scraper.valid, aliases);
      const unresolved = [...entry.scraper.pending, ...entry.scraper.invalid].map((r) => ({
        event_name: r.name,
        start_date: r.start,
        expiry_date: r.end,
        outcome: r.outcome,
        reason: r.reason,
        dateText: r.dateText,
        sources: r.sources,
      }));
      if (invalidEventsPath && unresolved.length) {
        saveInvalidEvents({ id: config.gameId, tag: config.key }, "scraper", unresolved, invalidEventsPath);
      }
    } catch (error) {
      entry.scraperError = error;
      failures.push({ game: config.key, source: "scraper", error });
    }

    if (!entry.live) {
      log(`${config.key}: old source…`);
      try {
        entry.legacy = await legacyFetch(config);
      } catch (error) {
        entry.legacyError = error;
        failures.push({ game: config.key, source: "old source", error });
      }
    }
  }

  // 2. What gets inserted (live: scraper, shadow: old source) and what's only checked for the report
  const candidates = perGame.flatMap((g) => (g.live ? g.scraperRows || [] : g.legacy || []));
  const reportOnly = perGame.flatMap((g) => (g.live ? [] : g.scraperRows || []));
  const toCheck = [...new Map([...candidates, ...reportOnly].map((e) => [keyOf(e), e])).values()];

  // 3. Backend rules (rejected events go to invalid-events.json), then one batch-check
  const { valid } = filterBackendValid(toCheck, invalidEventsPath);
  const validKeys = new Set(valid.map(keyOf));
  const check = valid.length ? await backend.batchCheck(valid.map(forBackend)) : { existing: [], new: [] };
  const existingKeys = new Set(check.existing.map(keyOf));
  const isNew = (e) => validKeys.has(keyOf(e)) && !existingKeys.has(keyOf(e));

  // 4. Insert (the candidates only, never the report-only rows)
  const toInsert = [...new Map(candidates.filter(isNew).map((e) => [keyOf(e), e])).values()];
  const inserted = new Set();
  const writeErrors = [];
  if (!dryRun) {
    for (const event of toInsert) {
      try {
        await backend.createEvent(forBackend(event));
        inserted.add(keyOf(event));
      } catch (error) {
        writeErrors.push({ event, error });
      }
    }
    if (writeErrors.length) {
      const error = new Error(
        `${writeErrors.length} event(s) were rejected by the backend: ${writeErrors.map((w) => `"${w.event.event_name}" (${w.error.message})`).join("; ")}`,
      );
      error.name = writeErrors.some((w) => w.error.name === "BackendAuthError") ? "BackendAuthError" : "BackendWriteError";
      failures.push({ game: "all", source: "backend", error });
    }
  }

  // 5. Per-game numbers + the shadow comparison
  for (const g of perGame) {
    const scraped = g.scraperRows || [];
    g.scraperNew = scraped.filter(isNew);
    g.scraperExisting = scraped.filter((e) => existingKeys.has(keyOf(e)));
    g.legacyNew = (g.legacy || []).filter(isNew);
    const mine = toInsert.filter((e) => String(e.game_id) === String(g.gameId));
    g.inserted = mine.filter((e) => inserted.has(keyOf(e)));
    g.wouldInsert = dryRun ? mine : [];
    if (!g.live && g.scraper && g.legacy) {
      g.comparison = compareSources(scraped, g.legacy);
      // Same event, different name, the old name is in the DB and the scraped one isn't: needs an alias
      g.aliasCandidates = g.comparison.matched
        .filter((m) => !m.sameName && existingKeys.has(keyOf(m.legacy)) && !existingKeys.has(keyOf(m.scraper)))
        .map((m) => ({ gameId: g.gameId, sourceName: m.scraper.event_name, dbName: m.legacy.event_name }));
    }
  }

  return { today, dryRun, perGame, failures, toInsert, insertedCount: inserted.size, writeErrors, checked: valid.length };
}

module.exports = { runSync, keyOf };
