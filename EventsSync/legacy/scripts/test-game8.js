const cheerio = require("cheerio");

/**
 * Feasibility probe: can EventsSync read event data from Game8?
 * Run with: node test-game8.js
 *
 * Reports, per game, whether the page is reachable and, if so, what
 * event-like tables/headings it contains, plus the parsed events.
 * Game8 is behind AWS WAF: Node's fetch currently gets through, but curl
 * gets a JS challenge (HTTP 202 + `x-amzn-waf-action: challenge`) or a
 * CloudFront 403, so the probe reports those as "blocked".
 */

const PAGES = [
  { gameId: 4, name: "Genshin Impact", url: "https://game8.co/games/Genshin-Impact" },
  { gameId: 3, name: "Honkai: Star Rail", url: "https://game8.co/games/Honkai-Star-Rail" },
  { gameId: 2, name: "Zenless Zone Zero", url: "https://game8.co/games/Zenless-Zone-Zero" },
  { gameId: 5, name: "Wuthering Waves", url: "https://game8.co/games/Wuthering-Waves" },
];

const HEADERS = {
  "User-Agent": "HourglassEventsSync/1.0 (personal project)",
  Accept: "text/html",
};

async function probe(page) {
  const res = await fetch(page.url, { headers: HEADERS, redirect: "follow" });
  const body = await res.text();
  const wafAction = res.headers.get("x-amzn-waf-action");

  if (wafAction || res.status === 202 || res.status === 403) {
    return {
      ok: false,
      reason: `blocked (HTTP ${res.status}${wafAction ? `, WAF action: ${wafAction}` : ""})`,
    };
  }
  if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };

  // Reachable: look for anything that looks like an event list.
  const $ = cheerio.load(body);
  const headings = $("h2, h3")
    .map((_, el) => $(el).text().trim())
    .get()
    .filter((t) => /event|banner|wish|warp|signal|convene/i.test(t));
  const tables = $("table").length;

  return { ok: true, title: $("title").text().trim(), tables, headings: headings.slice(0, 10), events: extractEvents($) };
}

const DATE = /(\d{1,2}\/\d{1,2}\/\d{4})|([A-Z][a-z]+ \d{1,2}, \d{4})/g;

/**
 * Pull event name + dates from the tables under the "Current/Ongoing/Upcoming Events"
 * headings. Formats differ per game ("09/24/2026 - 10/12/2026" vs "September 29, 2026"
 * end date only), so each linked cell is treated as one event.
 */
function extractEvents($) {
  const events = [];
  $("h3")
    .filter((_, el) => /^(Current|Ongoing|Upcoming) Events$/.test($(el).text().trim()))
    .each((_, heading) => {
      const section = $(heading).text().trim();
      $(heading)
        .nextUntil("h2, h3", "table")
        .find("td")
        .each((_, cell) => {
          const name = $(cell).find("a").first().text().replace(/\s+/g, " ").trim();
          const text = $(cell).closest("tr").text().replace(/\s+/g, " ");
          if (!name) return;
          const dates = [...$(cell).text().matchAll(DATE)].map((m) => m[0]);
          // GI/HSR put dates in the next column, not the name cell
          const rowDates = dates.length ? dates : [...text.matchAll(DATE)].map((m) => m[0]);
          events.push({ section, name, dates: rowDates });
        });
    });
  return events;
}

async function main() {
  console.log("Probing Game8...\n");
  let reachable = 0;

  for (const page of PAGES) {
    try {
      const result = await probe(page);
      if (result.ok) {
        reachable++;
        console.log(`✅ ${page.name}: "${result.title}" (${result.tables} tables)`);
        result.headings.forEach((h) => console.log(`     - ${h}`));
        console.log(`   Parsed ${result.events.length} events:`);
        result.events.forEach((e) =>
          console.log(`     [${e.section}] ${e.name} → ${e.dates.join(" - ") || "(no date)"}`)
        );
      } else {
        console.log(`❌ ${page.name}: ${result.reason}`);
      }
    } catch (error) {
      console.log(`❌ ${page.name}: ${error.message}`);
    }
  }

  console.log(
    reachable === 0
      ? "\nResult: Game8 is not scrapable with plain HTTP requests (bot protection)."
      : `\nResult: ${reachable}/${PAGES.length} pages reachable.`
  );
  if (reachable === 0) process.exitCode = 1;
}

main();
