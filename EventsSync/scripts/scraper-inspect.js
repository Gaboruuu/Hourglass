#!/usr/bin/env node
/**
 * Dump a page's structure: every heading, and the first rows of each table under it.
 * Used to read a new or changed layout quickly and to write/check the synthetic test fixtures.
 *
 *   npm run scraper:inspect -- <url | /games/<slug> | local .html file> [options]
 *   npm run scraper:inspect -- <game key>      run discovery + extraction for one game config
 *                                              (genshin, starrail, zenless, wuwa) and print the raw
 *                                              rows (with parsed dates) and versions. `--game <key>`
 *                                              works too, except through npm in PowerShell, which
 *                                              eats the `--` so npm keeps `--game` for itself
 *
 *   --rows <n>        table rows to show per table (default 3)
 *   --grep <regex>    only headings matching this (case-insensitive)
 *   --links <regex>   also list the page's links whose text matches this
 *   --save <name>     save the raw HTML to .snapshots/<name>.html (gitignored, never commit it)
 */
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const { createClient, absoluteUrl } = require("../src/scraper/client");

const SNAPSHOTS = path.join(__dirname, "..", ".snapshots");

function parseArgs(argv) {
  const args = { target: null, rows: 3, grep: null, links: null, save: null, game: null };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--game") args.game = argv[++i];
    else if (arg === "--rows") args.rows = Number(argv[++i]);
    else if (arg === "--grep") args.grep = new RegExp(argv[++i], "i");
    else if (arg === "--links") args.links = new RegExp(argv[++i], "i");
    else if (arg === "--save") args.save = argv[++i];
    else if (!args.target) args.target = arg;
  }
  return args;
}

const clean = (text) => text.replace(/\s+/g, " ").trim();
const cut = (text, n = 70) => (text.length > n ? `${text.slice(0, n - 1)}…` : text);

async function load(target) {
  if (fs.existsSync(target)) return fs.readFileSync(target, "utf8");
  return createClient().get(absoluteUrl(target));
}

function dump($, { rows, grep }) {
  console.log(`Title: ${clean($("title").text())}\n`);
  $("h2, h3, h4").each((_, heading) => {
    const text = clean($(heading).text());
    if (grep && !grep.test(text)) return;
    const level = heading.tagName.toLowerCase();
    console.log(`${"  ".repeat(Number(level[1]) - 2)}${level.toUpperCase()} ${text}`);

    const stop = level === "h4" ? "h2, h3, h4" : level === "h3" ? "h2, h3" : "h2";
    $(heading)
      .nextUntil(stop, "table")
      .slice(0, 3)
      .each((t, table) => {
        const trs = $(table).find("tr");
        console.log(`${"  ".repeat(Number(level[1]) - 1)}table ${t + 1}: ${trs.length} rows`);
        trs.slice(0, rows).each((_, tr) => {
          const cells = $(tr)
            .children("th, td")
            .map((__, cell) => {
              const img = $(cell).find("img[data-src]").length ? "[img] " : "";
              return `${img}${cut(clean($(cell).text()))}`;
            })
            .get();
          console.log(`${"  ".repeat(Number(level[1]))}| ${cells.join(" | ")}`);
        });
      });
  });
}

async function inspectGame(key) {
  const { byKey } = require("../src/scraper/games");
  const { fetchRaw } = require("../src/scraper/fetchRaw");
  const { parseDateText, todayUtc } = require("../src/scraper/dates");
  const config = byKey(key);
  if (!config) throw new Error(`No game config "${key}"`);
  const today = todayUtc();
  const client = createClient();
  const raw = await fetchRaw(config, client, { today });

  console.log(`${config.key} (game ${config.gameId}), today ${today}, ${client.requests} requests\n`);
  console.log("Pages:");
  for (const [page, url] of Object.entries(raw.pages)) console.log(`  ${page.padEnd(8)} ${url}`);

  console.log("\nVersions:");
  for (const v of raw.versions) {
    const extra = [v.endDate && `ends ${v.endDate}`, v.releaseAt && `live ${v.releaseAt}`, v.maintenanceStartAt && `maintenance ${v.maintenanceStartAt}`, v.teaser && "teaser"];
    console.log(`  ${v.version.padEnd(5)} ${v.releaseDate || "no date".padEnd(10)}  ${extra.filter(Boolean).join(", ")}  ${v.url}`);
  }

  let section = null;
  for (const row of raw.rows) {
    const label = `${row.source} / ${row.section} (${row.status})`;
    if (label !== section) console.log(`\n${(section = label)}`);
    let dates;
    try {
      const d = parseDateText(row.dateText, { today, singleDate: row.singleDate });
      dates = `${d.start || "?"} → ${d.end || "?"}${d.startYearInferred || d.endYearInferred ? " (year inferred)" : ""}${d.versionRef ? ` [${d.versionRef.kind} ${d.versionRef.version}]` : ""}`;
    } catch (error) {
      dates = `DATE ERROR: ${error.message}`;
    }
    console.log(`  ${cut(row.name, 45).padEnd(45)} ${dates.padEnd(40)} ${row.image ? "img" : "-"}`);
  }

  if (raw.warnings.length) {
    console.log("\nWarnings:");
    raw.warnings.forEach((w) => console.log(`  ${w}`));
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.game) return inspectGame(args.game);
  // A bare game key ("wuwa") means game mode
  if (args.target && require("../src/scraper/games").byKey(args.target)) return inspectGame(args.target);
  if (!args.target) {
    console.error("Usage: npm run scraper:inspect -- <url | /games/<slug> | file.html> [--rows n] [--grep re] [--links re] [--save name]");
    process.exit(1);
  }
  const html = await load(args.target);
  const $ = cheerio.load(html);

  if (args.save) {
    fs.mkdirSync(SNAPSHOTS, { recursive: true });
    const file = path.join(SNAPSHOTS, `${args.save.replace(/[^\w.-]/g, "_")}.html`);
    fs.writeFileSync(file, html);
    console.log(`Saved ${file}\n`);
  }

  dump($, args);

  if (args.links) {
    console.log("\nLinks:");
    const seen = new Set();
    $("a[href]").each((_, a) => {
      const text = clean($(a).text());
      const href = $(a).attr("href");
      if (!args.links.test(text) || seen.has(href + text)) return;
      seen.add(href + text);
      console.log(`  ${cut(text, 80)}  →  ${href}`);
    });
  }
}

main().catch((error) => {
  console.error(`${error.name}: ${error.message}${error.context?.url ? ` (${error.context.url})` : ""}`);
  process.exit(1);
});
