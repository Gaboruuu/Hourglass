#!/usr/bin/env node
/**
 * Daily event sync (GitHub Actions, `npm run sync`).
 *
 *   npm run sync                      scrape every enabled game, check the DB, insert new events
 *   npm run sync -- --dry-run         everything up to the DB check, nothing written
 *   npm run sync -- <game key>        one game only (a bare key also works in PowerShell)
 *
 * Every game is scraped from the source site (src/scraper/) and inserted when it isn't in the DB yet.
 * Runs on the maintainer's laptop (scripts/run-daily-sync.ps1 via Task Scheduler): the site blocks
 * GitHub's servers.
 *
 * Outputs (all gitignored, uploaded by CI): sync-report.md (also the GitHub job summary),
 * invalid-events.json (pending / invalid / rejected events), sync-errors.md (only when something
 * failed: the workflow turns it into a GitHub issue, and the run exits with 1).
 */
const fs = require("fs");
const path = require("path");
const { games, byKey } = require("./src/scraper/games");
const { EventScraper } = require("./src/scraper/EventScraper");
const { createClient } = require("./src/scraper/client");
const { getSyncApiKey } = require("./src/config/backend");
const backend = require("./src/services/backendClient");
const { loadAliases } = require("./src/sync/aliases");
const { runSync } = require("./src/sync/runSync");
const { buildReport, writeReport } = require("./src/sync/report");

const OUT = {
  invalid: path.join(__dirname, "invalid-events.json"),
  errors: path.join(__dirname, "sync-errors.md"),
  report: path.join(__dirname, "sync-report.md"),
};

/**
 * There is no old source anymore: every game went live on the scraper (2026-11-22) and the old
 * fetchers only remain in legacy/ for reference. runSync still supports `live: false` (shadow mode,
 * an old source inserts and the scraper only reports), e.g. for a future second source.
 */
async function legacyFetch(config) {
  throw new Error(`${config.key} has live: false, but there is no old source to write it: set live: true in src/scraper/games/${config.key}.js`);
}

const HINTS = {
  BackendAuthError: "The backend refused the sync's API key. Check that the GitHub secret `SYNC_API_KEY` is in Render's `SYNC_API_KEYS`.",
  SourceBlockedError: "The scraped site refused the request. It usually passes on the next run; if it keeps failing, check `src/scraper/source.js`.",
};

/** sync-errors.md (the workflow's GitHub issue body) and a failing exit code */
function reportFailures(failures) {
  if (failures.length === 0) return;
  const body = failures
    .map(({ game, source, error }) =>
      [
        `### ${game} (${source})`,
        `**${error.name}**: ${error.message}`,
        error.fileHint ? `Look at: \`${error.fileHint}\`` : "",
        error.context?.url ? `Page: ${error.context.url}` : "",
        error.context?.rowHtml ? `Row:\n\n\`\`\`html\n${error.context.rowHtml}\n\`\`\`` : "",
        HINTS[error.name] || "",
      ]
        .filter(Boolean)
        .join("\n\n"),
    )
    .join("\n\n");
  fs.writeFileSync(OUT.errors, `The daily event sync hit ${failures.length} problem(s).\n\n${body}\n`, "utf8");
  console.error(`\n✗ ${failures.length} problem(s), see sync-errors.md`);
  process.exitCode = 1;
}

function parseArgs(argv) {
  const dryRun = argv.includes("--dry-run");
  const gameIndex = argv.indexOf("--game");
  const key = gameIndex >= 0 ? argv[gameIndex + 1] : argv.find((a) => !a.startsWith("--"));
  return { dryRun, key };
}

async function main() {
  const { dryRun, key } = parseArgs(process.argv.slice(2));
  getSyncApiKey(); // fail before fetching anything if the backend credential is missing

  for (const file of Object.values(OUT)) if (fs.existsSync(file)) fs.unlinkSync(file);

  const selected = key ? [byKey(key)] : games.filter((g) => g.enabled);
  if (!selected[0]) throw new Error(`No game config "${key}"`);

  const client = createClient(); // shared: the delay between requests applies across games
  const result = await runSync({
    games: selected,
    scrape: (config) => new EventScraper(config, { client }).collect(),
    legacyFetch,
    backend,
    aliases: loadAliases(),
    dryRun,
    invalidEventsPath: OUT.invalid,
    today: new Date().toISOString().slice(0, 10),
    log: (line) => console.log(line),
  });

  const markdown = buildReport(result);
  console.log(`\n${markdown}`);
  writeReport(markdown, { file: OUT.report });
  reportFailures(result.failures);
  return result;
}

module.exports = { main, legacyFetch };

if (require.main === module) {
  main().catch((error) => {
    console.error("Sync failed:", error);
    reportFailures([{ game: "all", source: "sync", error }]);
  });
}
