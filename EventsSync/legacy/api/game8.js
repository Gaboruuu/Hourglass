const cheerio = require("cheerio");
const { getEventType } = require("../services/eventService");
const {
  loadIgnoredEvents,
  loadDailyEvents,
  shouldIgnoreEvent,
  isDailyEvent,
  saveInvalidEvents,
} = require("../../src/utils/eventFilters");

/**
 * Game8 "List of Events and Schedule" pages. Each row of the Ongoing/Upcoming tables:
 *   <td><a href="…"><img data-src="https://img.game8.co/…/show">Chord Cleansing</a></td>
 *   <td>September 22, 2026 - <br>September 29, 2026 <hr> Reach Union Level 19</td>
 * Upcoming events without announced dates say "Releases in Version 3.7" instead.
 */
const GAME8_PAGES = {
  5: "https://game8.co/games/Wuthering-Waves/archives/453473",
};

const SECTIONS = { ongoing: ["Ongoing Events", "Current Events"], upcoming: ["Upcoming Events"] };
const HEADERS = {
  "User-Agent": "HourglassEventsSync/1.0 (personal project)",
  Accept: "text/html",
};
const MONTH_DATE = /([A-Z][a-z]+ \d{1,2}, \d{4})/g;

/** Game8 refused the request (AWS WAF challenge, CloudFront 403, rate limit). */
class Game8BlockedError extends Error {
  constructor(message) {
    super(message);
    this.name = "Game8BlockedError";
  }
}

/** The page loaded but doesn't look like we expect: the parser needs updating. */
class Game8LayoutError extends Error {
  constructor(message) {
    super(message);
    this.name = "Game8LayoutError";
  }
}

/** "September 22, 2026" → "2026-09-22" */
function toIsoDate(text) {
  const d = new Date(`${text} UTC`);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
}

/**
 * Throws Game8BlockedError if the response is a bot-protection page rather than content.
 */
function assertNotBlocked(status, headers, body) {
  const waf = headers.get("x-amzn-waf-action");
  if (waf || status === 202 || status === 403 || status === 429) {
    throw new Game8BlockedError(`Game8 blocked the request (HTTP ${status}${waf ? `, WAF action: ${waf}` : ""})`);
  }
  if (status !== 200) throw new Game8BlockedError(`Game8 returned HTTP ${status}`);
  if (!/Game8/i.test(cheerio.load(body)("title").text())) {
    throw new Game8BlockedError("Game8 returned a page without its normal title (challenge page?)");
  }
}

/**
 * Parse one section's table. Throws Game8LayoutError when the structure is not what we expect.
 */
function parseSection($, titles) {
  const heading = $("h3")
    .filter((_, el) => titles.includes($(el).text().trim()))
    .first();
  if (!heading.length) throw new Game8LayoutError(`Heading "${titles.join('" / "')}" not found`);

  const table = heading.nextUntil("h2, h3", "table").first();
  if (!table.length) throw new Game8LayoutError(`No table under "${heading.text().trim()}"`);

  const events = [];
  table.find("tr").each((i, row) => {
    const cells = $(row).find("td");
    if (cells.length === 0) return; // header row
    if (cells.length < 2) throw new Game8LayoutError(`Row ${i} under "${heading.text().trim()}" has ${cells.length} column(s), expected 2`);

    const link = cells.eq(0).find("a").first();
    const img = cells.eq(0).find("img").first();
    const name = link.text().replace(/\s+/g, " ").trim();
    if (!name) throw new Game8LayoutError(`Row ${i} under "${heading.text().trim()}" has no event name link`);

    // Before the <hr>: date range or "Releases in Version x.x". After: unlock requirement.
    const [dateHtml] = (cells.eq(1).html() || "").split(/<hr[^>]*>/);
    const dateText = cheerio.load(dateHtml).text();
    const dates = [...dateText.matchAll(MONTH_DATE)].map((m) => toIsoDate(m[1]));
    const version = dateText.match(/Version (\d+\.\d+)/)?.[1] || null;
    if (dates.length === 0 && !version) {
      throw new Game8LayoutError(`Can't read the date of "${name}": "${dateText.replace(/\s+/g, " ").trim()}"`);
    }

    const imageUrl = img.attr("data-src") || img.attr("src") || null;
    events.push({
      title: name,
      start_date: dates[0] || null,
      expiry_date: dates[1] || null,
      version,
      background_url: imageUrl && !imageUrl.startsWith("data:") ? imageUrl : null,
    });
  });

  return events;
}

/**
 * Parse a Game8 events page into raw events. Exported separately so it can be tested on saved HTML.
 */
function parseGame8EventsPage(html) {
  const $ = cheerio.load(html);
  const ongoing = parseSection($, SECTIONS.ongoing);
  // A live game always has something running; an empty table means the layout moved.
  if (ongoing.length === 0) throw new Game8LayoutError("Ongoing events table is empty");

  let upcoming = [];
  try {
    upcoming = parseSection($, SECTIONS.upcoming);
  } catch (error) {
    // The upcoming section is sometimes removed between versions; only a broken row is fatal.
    if (!/not found/.test(error.message)) throw error;
    console.warn(`⚠ ${error.message}, continuing with ongoing events only`);
  }
  return [...ongoing, ...upcoming];
}

async function fetchGame8Events(game) {
  const url = GAME8_PAGES[game.id];
  if (!url) throw new Error(`No Game8 page configured for game ${game.id}`);
  console.log(`Fetching ${game.tag} events from Game8`);

  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(30000) });
  const html = await response.text();
  assertNotBlocked(response.status, response.headers, html);

  const rawEvents = parseGame8EventsPage(html);
  console.log(`\n✓ Found ${rawEvents.length} events on Game8`);

  const ignoredEvents = loadIgnoredEvents();
  const dailyEvents = loadDailyEvents();
  const validEvents = [];
  const invalidEvents = [];
  let unannounced = 0;
  let ignored = 0;

  for (const event of rawEvents) {
    if (shouldIgnoreEvent(event.title, game.id, ignoredEvents)) {
      ignored++;
      continue;
    }
    // Upcoming event whose dates Game8 doesn't know yet: pick it up on a later run
    if (!event.start_date && !event.expiry_date && event.version) {
      unannounced++;
      continue;
    }

    const formatted = {
      game_id: parseInt(game.id),
      event_name: event.title,
      start_date: event.start_date,
      expiry_date: event.expiry_date,
      daily_login: isDailyEvent(event.title, game.id, dailyEvents) ? 1 : 0,
      event_type: getEventType(event.start_date, event.expiry_date),
      background_url: event.background_url,
    };

    // Game8 is hand-edited: reject missing dates and typos like an end before the start
    if (formatted.start_date && formatted.expiry_date && formatted.start_date <= formatted.expiry_date) {
      validEvents.push(formatted);
    } else {
      invalidEvents.push(formatted);
    }
  }

  saveInvalidEvents(game, "game8", invalidEvents);
  if (ignored > 0) console.log(`⊘ ${ignored} events ignored based on configuration`);
  if (unannounced > 0) console.log(`⏳ ${unannounced} upcoming events without announced dates skipped`);
  console.log(`✓ ${validEvents.length} valid events ready for database import`);

  return validEvents;
}

module.exports = {
  fetchGame8Events,
  parseGame8EventsPage,
  assertNotBlocked,
  Game8BlockedError,
  Game8LayoutError,
};
