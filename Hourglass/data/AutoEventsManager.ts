import { ApiEvent, EventBackgroundImage } from "./EventInteface";
import { Cheerio, CheerioAPI, load as loadHtml } from "cheerio";
import { request } from "undici";
import type { Element } from "domhandler";

type Status = "current" | "upcoming";

export interface EventItem {
  name: string;
  startDate: string | null;
  endDate: string | null;
  imageUrl: string | null;
  sourceUrl: string;
  status: Status;
  game: string;
}

const SECTION_TITLES = {
  current: /^current(\[\])?$/i,
  upcoming: /^upcoming(\[\])?$/i,
};

async function fetchHtml(url: string): Promise<string> {
  const { body, statusCode } = await request(url, { method: "GET" });
  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`Failed to fetch HTML from ${url}`);
  }
  return await body.text();
}

function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function deriveGameNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    // e.g. https://zenless-zone-zero.fandom.com/wiki/Event
    // take subdomain before .fandom.com, replace hyphens with spaces/title-case
    const sub = u.hostname.split(".fandom.com")[0] ?? "";
    return sub
      .replace(/-/g, " ")
      .replace(/\b\w/g, (m) => m.toUpperCase())
      .trim();
  } catch {
    return "Unknown";
  }
}

function firstImgSrc(
  $section: CheerioAPI | any,
  sectionEl: Element
): string | null {
  const imgEl = $section(sectionEl).find("img").first();
  if (!imgEl.length) return null;
  return (
    imgEl.attr("data-src") ||
    imgEl.attr("src") ||
    imgEl.attr("data-original") ||
    null
  );
}

function getFirstEventAnchor(
  $section: CheerioAPI,
  sectionEl: Element
): Cheerio<Element> | null {
  const links = $section(sectionEl).find("a");
  for (const el of links.toArray()) {
    const a = $section(el);
    const href = a.attr("href") || "";
    const hasImg = !!a.find("img").length;
    const text = normalize(a.text());
    if (!text) continue;

    // must be a content page, not image/file/special pages
    if (!href.includes("/wiki/")) continue;
    if (/\/wiki\/(File|Special):/i.test(href)) continue;
    // Skip if text starts with "File:"
    if (/^File:/i.test(text)) continue;
    if (hasImg) continue;

    return a;
  }
  return null;
}

function getSectionRoot(
  $: CheerioAPI,
  status: Status
): Cheerio<Element> | null {
  const sections = $("h2, h3, h4").toArray();
  const pred = SECTION_TITLES[status];
  for (const s of sections) {
    const title = normalize(
      $(s)
        .text()
        .replace(/\[\s*edit\s\]$/i, "")
    );
    if (pred.test(title)) {
      return $(s);
    }
  }
  return null;
}

function findSectionTableAfter(
  $: CheerioAPI,
  heading: Cheerio<Element>
): Cheerio<Element> | null {
  let el = heading.next();
  while (el && el.length) {
    // consider tables anywhere below the heading until next heading
    if (el.is("table")) {
      // prefer tables that have headers including "Event" (but don't require it)
      const headerText = normalize(el.find("th, thead").text()); // <-- thead
      if (/No Events match/i.test(el.text())) return null;

      // If it has rows, accept it even if headerText didn't contain "Event"
      if (el.find("tr").length > 1) return el;
    }

    // div-wrapped tables (Fandom often does this)
    if (el.is("div") && el.find("table").length) {
      const t = el.find("table").first();
      const headerText = normalize(t.find("th, thead").text());
      if (/No Events match/i.test(t.text())) return null;
      if (t.find("tr").length > 1) return t;
    }

    if (el.is("h2, h3, h4")) break;
    el = el.next();
  }
  return null;
}

function readTypeTextFromRowCells(
  $: CheerioAPI,
  row: Cheerio<Element>
): string | null {
  const cells = row.find("td, th").toArray();
  if (cells.length < 2) return null;
  const lastCellText = normalize($(cells[cells.length - 1]).text());
  if (
    /Type/i.test(normalize($(row).closest("table").find("th").last().text()))
  ) {
    return lastCellText || null;
  }

  const whole = normalize(row.text());
  const typeMatch = whole.match(
    /\b(In-Game|Web|Check-In|Mail|Social Media|Fan Art|Collaboration|Critical Node|Audition Stage|Deadly Assault)\b/i
  );
  return typeMatch ? typeMatch[0] : null;
}

function parseDateLoose(s: string): Date | null {
  if (!s) return null;
  const clean = s
    .replace(/\(.*?\)/g, "") // remove (Server Time) etc.
    .replace(/\s{2,}/g, " ")
    .trim();

  // Try “Month DD, YYYY HH:MM” or “Month DD, YYYY”
  const m1 = clean.match(/([A-Za-z]+ \d{1,2}, \d{4}(?: \d{1,2}:\d{2})?)/);
  if (m1) {
    const d = new Date(m1[1]);
    if (!isNaN(d.getTime())) return d;
  }

  // Try “YYYY/MM/DD HH:MM” or “YYYY/MM/DD”
  const m2 = clean.match(/(\d{4}\/\d{1,2}\/\d{1,2}(?: \d{1,2}:\d{2})?)/);
  if (m2) {
    const isoish = m2[1].replace(/\//g, "-");
    const d = new Date(isoish);
    if (!isNaN(d.getTime())) return d;
  }

  // Try “YYYY-MM-DD”
  const m3 = clean.match(/(\d{4}-\d{2}-\d{2})/);
  if (m3) {
    const d = new Date(m3[1]);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

function toISOorNull(dateStr: string | null): string | null {
  if (!dateStr) return null;
  if (/^(tba|n\/a|indefinite)$/i.test(dateStr)) return null;
  const d = parseDateLoose(dateStr);
  return d ? d.toISOString() : null;
}

function splitDurationStrict(durationCell: string | null): {
  start: string | null;
  end: string | null;
} {
  if (!durationCell) return { start: null, end: null };
  // split on an en dash / em dash / hyphen surrounded by spaces
  const parts = durationCell.split(/\s*[–—-]\s*/);
  const start = toISOorNull(parts[0] ?? null);
  const end = toISOorNull(parts[1] ?? null);
  return { start, end };
}

async function fetchEventTypeFromDetailPage(
  eventUrl: string
): Promise<string | null> {
  try {
    const html = await fetchHtml(eventUrl);
    const $ = loadHtml(html);

    // Look for a "Type" section header then the value right below
    // Wuthering Waves example has a "### Type" with a linked type (e.g., Web)
    const typeHeading = $("h2, h3, h4")
      .filter((_, el) => /^type$/i.test(normalize($(el).text())))
      .first();

    if (typeHeading.length) {
      // Next in-flow text/link
      let n = typeHeading.next();
      // Walk down until we find text/links
      for (let i = 0; i < 5 && n && n.length; i++) {
        const txt = normalize(n.text());
        if (txt) {
          // Prefer anchor text if present
          const a = n.find("a").first();
          const typeText = a.length ? normalize(a.text()) : txt;
          return typeText || null;
        }
        n = n.next();
      }
    }

    // Fallback: search infobox / info lists for a "Type" label
    const label = $("th, td, dt")
      .filter((_, el) => /^type\s*:?\s*$/i.test(normalize($(el).text())))
      .first();
    if (label.length) {
      const val =
        label.next("td, dd").text() ||
        label.parent().find("td, dd").not(label).first().text();
      return normalize(val) || null;
    }

    // Last resort: scan page text
    const m = normalize($("body").text()).match(
      /\b(In-Game|In Game|Web|Check-In|Mail|Collaboration)\b/i
    );
    return m ? m[0] : null;
  } catch {
    return null;
  }
}

function extractDurationTextFromRow(
  $: CheerioAPI,
  row: Cheerio<Element>
): string | null {
  // Preferred: middle cell (Duration)
  const cells = row.find("td, th").toArray();
  if (cells.length >= 2) {
    // Heuristic: duration is the first cell containing "–" or "Indefinite" or "TBA"
    for (let i = 0; i < cells.length; i++) {
      const t = normalize($(cells[i]).text());
      if (/[–—-]/.test(t) || /Indefinite|TBA/i.test(t)) {
        return t;
      }
    }
  }
  // Fallback: row text—try to isolate the part between title and type
  const whole = normalize(row.text());
  const m = whole.match(
    /([A-Za-z]+\s+\d{1,2},\s*\d{4}.*?(?:TBA|Indefinite|\d{4}))/
  );
  return m ? m[0] : null;
}

function absoluteUrl(base: string, href: string | undefined): string {
  if (!href) return base;
  try {
    return new URL(href, base).toString();
  } catch {
    return href;
  }
}

function getColumnMap($: CheerioAPI, table: Cheerio<Element>) {
  const headerCells = table.find("tr").first().find("th, td");
  const map: Record<string, number> = {};
  headerCells.each((i, el) => {
    const t = normalize($(el).text()).toLowerCase();
    if (/\bevent\b/.test(t)) map.event = i;
    if (/\bduration\b/.test(t)) map.duration = i;
    if (/\btype/.test(t)) map.type = i;
    if (/\bversion\b/.test(t)) map.version = i;
  });
  return map;
}

function getCellTextByIndex(
  $: CheerioAPI,
  row: Cheerio<Element>,
  idx?: number
): string | null {
  if (idx == null) return null;
  const cells = row.find("td, th").toArray();
  if (idx < 0 || idx >= cells.length) return null;
  return normalize($(cells[idx]).text());
}

async function parseSection(
  $: CheerioAPI,
  baseUrl: string,
  status: Status
): Promise<EventItem[]> {
  const out: EventItem[] = [];
  const heading = getSectionRoot($, status);
  if (!heading) return out;

  const table = findSectionTableAfter($, heading);
  if (!table || !table.find("tr").length) return out;

  const game = deriveGameNameFromUrl(baseUrl);
  const col = getColumnMap($, table);

  table
    .find("tr")
    .slice(1)
    .each((_i, tr) => {
      const row = $(tr);
      // Skip empty rows
      if (!row.find("td").length) return;

      // Pick the event link safely
      const a = getFirstEventAnchor($, tr);
      if (!a) return;

      const name = normalize(a.text());
      const eventUrl = absoluteUrl(baseUrl, a.attr("href"));

      // Image (best-effort)
      const imageUrl = firstImgSrc($, tr);

      // Duration from the duration column only
      const durationText = getCellTextByIndex($, row, col.duration) || "";
      const { start, end } = splitDurationStrict(durationText);

      // Inline type if table has it (ZZZ); else null -> we'll fetch detail page
      let inlineType: string | null = null;
      if (col.type != null) {
        inlineType = getCellTextByIndex($, row, col.type);
      } else {
        // No type column - will need to fetch from detail page
        // Don't assume based on Version column
        inlineType = readTypeTextFromRowCells($, row);
      }

      (out as any).push({
        name,
        startDate: start,
        endDate: end,
        imageUrl: imageUrl ? absoluteUrl(baseUrl, imageUrl) : null,
        sourceUrl: eventUrl,
        status,
        game,
        __inlineType: inlineType,
      });
    });

  const filtered: EventItem[] = [];
  for (const raw of out as any[]) {
    const inlineType = raw.__inlineType as string | null;

    if (inlineType && /in[-\s]?game/i.test(inlineType)) {
      const { __inlineType, ...clean } = raw;
      filtered.push(clean);
      continue;
    }

    const t = await fetchEventTypeFromDetailPage(raw.sourceUrl);
    if (t && /in[-\s]?game/i.test(t)) {
      const { __inlineType, ...clean } = raw;
      filtered.push(clean);
    }
  }
  return filtered;
}

export async function scrapeFandomEvents(
  eventsUrl: string
): Promise<EventItem[]> {
  const html = await fetchHtml(eventsUrl);
  const $ = loadHtml(html);

  const [current, upcoming] = await Promise.all([
    parseSection($, eventsUrl, "current"),
    parseSection($, eventsUrl, "upcoming"),
  ]);

  return [...current, ...upcoming];
}

/**
 * Calculate remaining days from now until expiry date
 */
function calculateRemaining(expiryDate: string): string {
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? `${diffDays}` : "0";
}

/**
 * Convert EventItem to ApiEvent
 * Uses event name as ID (to be changed when inserting into DB)
 */
export function convertToApiEvent(
  item: EventItem,
  gameId: string
): ApiEvent | null {
  // Skip if missing required dates
  if (!item.startDate || !item.endDate) {
    return null;
  }

  return {
    event_id: item.name, // Using name as ID for now
    event_name: item.name,
    game_id: gameId,
    game_name: item.game,
    start_date: item.startDate,
    expiry_date: item.endDate,
    event_type: "main",
    daily_login: false,
    remaining: calculateRemaining(item.endDate),
  };
}

/**
 * Convert EventItem image to EventBackgroundImage
 */
export function convertToEventBackground(
  item: EventItem
): EventBackgroundImage | null {
  if (!item.imageUrl) {
    return null;
  }

  return {
    event_id: item.name, // Using name as ID for now
    image_url: item.imageUrl,
  };
}

/**
 * Convert EventItem array to ApiEvent and EventBackgroundImage arrays
 */
export function convertEventsData(
  items: EventItem[],
  gameId: string
): { events: ApiEvent[]; backgrounds: EventBackgroundImage[] } {
  const events: ApiEvent[] = [];
  const backgrounds: EventBackgroundImage[] = [];

  for (const item of items) {
    const event = convertToApiEvent(item, gameId);
    if (event) {
      events.push(event);

      const background = convertToEventBackground(item);
      if (background) {
        backgrounds.push(background);
      }
    }
  }

  return { events, backgrounds };
}

// Example runner
if (require.main === module) {
  (async () => {
    const urls = [
      { url: "https://zenless-zone-zero.fandom.com/wiki/Event", gameId: "zzz" },
      { url: "https://wutheringwaves.fandom.com/wiki/Event", gameId: "ww" },
      { url: "https://honkai-star-rail.fandom.com/wiki/Events", gameId: "hsr" },
      { url: "https://genshin-impact.fandom.com/wiki/Event", gameId: "gi" },
    ];

    for (const { url, gameId } of urls) {
      console.log(`\n=== Scraping: ${url} ===`);

      // Scrape events
      const eventItems = await scrapeFandomEvents(url);
      console.log(`Found ${eventItems.length} events\n`);

      //   // Convert to API format
      //   const { events, backgrounds } = convertEventsData(eventItems, gameId);

      //   console.log("Converted Events:");
      //   console.log(JSON.stringify(events, null, 2));

      //   console.log("\nEvent Backgrounds:");
      //   console.log(JSON.stringify(backgrounds, null, 2));
    }
  })().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
