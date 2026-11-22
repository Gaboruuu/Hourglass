/**
 * Shadow mode: the scraper's events next to the old source's, per game.
 *   matched      the same event in both (same dates or not; a different name → alias candidate)
 *   onlyScraper  the scraper found it, the old source didn't
 *   onlyLegacy   the old source found it, the scraper didn't
 * Rows are DB-shaped ({ game_id, event_name, start_date, expiry_date, … }).
 */
const { isSameEvent } = require("../scraper/match");

const asMatchRow = (row) => ({
  game: row.game_id,
  kind: row.event_type === "banner" ? "banner" : "event",
  name: row.event_name,
  start: row.start_date || null,
  end: row.expiry_date || null,
});

function compareSources(scraperRows, legacyRows) {
  const unmatched = [...legacyRows];
  const matched = [];
  const onlyScraper = [];

  for (const scraped of scraperRows) {
    const index = unmatched.findIndex((legacy) => isSameEvent(asMatchRow(scraped), asMatchRow(legacy)));
    if (index < 0) {
      onlyScraper.push(scraped);
      continue;
    }
    const [legacy] = unmatched.splice(index, 1);
    matched.push({
      scraper: scraped,
      legacy,
      sameName: scraped.event_name.trim().toLowerCase() === legacy.event_name.trim().toLowerCase(),
      sameDates: scraped.start_date === legacy.start_date && scraped.expiry_date === legacy.expiry_date,
    });
  }
  return { matched, onlyScraper, onlyLegacy: unmatched };
}

module.exports = { compareSources };
