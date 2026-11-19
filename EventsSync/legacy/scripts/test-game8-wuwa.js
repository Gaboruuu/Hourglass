const {
  fetchGame8Events,
  parseGame8EventsPage,
  assertNotBlocked,
  Game8BlockedError,
  Game8LayoutError,
} = require("../api/game8");

/**
 * Tests the Game8 Wuthering Waves scraper (src/api/game8.js).
 * Run with: node test-game8-wuwa.js
 *
 * 1. Live: one real request to Game8, parsed like the daily sync does.
 * 2. Offline: bot-protection responses and layout changes are simulated from the
 *    downloaded HTML, so the error paths are tested without hammering Game8.
 */

const PAGE_URL = "https://game8.co/games/Wuthering-Waves/archives/453473";
const WUWA = { id: "5", tag: "wuwa" };

let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    failed++;
    console.log(`❌ ${name}\n     ${error.message}`);
  }
}

/** Assert fn throws an error of the given class (and optionally a matching message). */
function expectThrows(fn, ErrorClass, pattern) {
  try {
    fn();
  } catch (error) {
    if (!(error instanceof ErrorClass)) throw new Error(`Expected ${ErrorClass.name}, got ${error.name}: ${error.message}`);
    if (pattern && !pattern.test(error.message)) throw new Error(`Unexpected message: ${error.message}`);
    console.log(`     → ${error.name}: ${error.message}`);
    return;
  }
  throw new Error(`Expected ${ErrorClass.name}, but nothing was thrown`);
}

const headers = (obj = {}) => new Headers(obj);

async function main() {
  console.log("=== Live (1 request) ===");
  const events = await fetchGame8Events(WUWA);
  for (const e of events) {
    console.log(`   ${e.start_date} → ${e.expiry_date}  [${e.event_type}${e.daily_login ? ", daily" : ""}] ${e.event_name}`);
    console.log(`     ${e.background_url}`);
  }
  check("live page returns events with dates and images", () => {
    if (events.length === 0) throw new Error("No events parsed");
    const noImage = events.filter((e) => !e.background_url);
    if (noImage.length) throw new Error(`Missing image: ${noImage.map((e) => e.event_name).join(", ")}`);
  });

  // Reuse the page we just downloaded as a fixture for the offline tests
  const html = await (await fetch(PAGE_URL, { headers: { "User-Agent": "HourglassEventsSync/1.0 (personal project)" } })).text();

  console.log("\n=== Simulated bot protection ===");
  check("AWS WAF challenge (202 + header) is reported as blocked", () =>
    expectThrows(() => assertNotBlocked(202, headers({ "x-amzn-waf-action": "challenge" }), ""), Game8BlockedError),
  );
  check("CloudFront 403 is reported as blocked", () =>
    expectThrows(() => assertNotBlocked(403, headers(), "<TITLE>ERROR: The request could not be satisfied</TITLE>"), Game8BlockedError),
  );
  check("429 rate limit is reported as blocked", () => expectThrows(() => assertNotBlocked(429, headers(), ""), Game8BlockedError));
  check("200 with a challenge page instead of content is reported as blocked", () =>
    expectThrows(() => assertNotBlocked(200, headers(), "<title>Human Verification</title>"), Game8BlockedError),
  );
  check("normal page passes", () => assertNotBlocked(200, headers(), html));

  console.log("\n=== Simulated layout changes ===");
  check("renamed section heading", () =>
    expectThrows(() => parseGame8EventsPage(html.replace(/>\s*Ongoing Events\s*</g, ">Live Events<")), Game8LayoutError, /not found/),
  );
  check("unreadable date format", () =>
    expectThrows(
      // e.g. Game8 switches from "September 22, 2026" to "22/09/2026"
      () => parseGame8EventsPage(html.replace(/[A-Z][a-z]+ (\d{1,2}), (\d{4})/g, "$1/09/$2")),
      Game8LayoutError,
      /date/,
    ),
  );
  check("table replaced by cards (no table under heading)", () =>
    expectThrows(
      () => parseGame8EventsPage(html.replace(/(Ongoing Events\s*<\/h3>[\s\S]*?)<table/, "$1<div")),
      Game8LayoutError,
    ),
  );
  check("missing Upcoming section only warns", () => {
    const events = parseGame8EventsPage(html.replace(/>\s*Upcoming Events\s*</g, ">Soon<"));
    if (events.length === 0) throw new Error("Expected ongoing events to still parse");
  });

  console.log(failed ? `\n❌ ${failed} check(s) failed` : "\n✅ All checks passed");
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`❌ ${error.name}: ${error.message}`);
  process.exitCode = 1;
});
