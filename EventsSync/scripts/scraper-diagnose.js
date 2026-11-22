#!/usr/bin/env node
/**
 * Run the whole pipeline for one game (or all) against the live source and print every stage.
 * Never contacts the backend.
 *
 *   npm run scraper:diagnose -- <game key | all> [--json]
 *
 *   game key   genshin, starrail, zenless, wuwa (a bare key also works in PowerShell, which eats `--`)
 *   --json     print the collect() result as JSON instead (for comparing runs)
 */
const { games, byKey } = require("../src/scraper/games");
const { EventScraper } = require("../src/scraper/EventScraper");
const { createClient } = require("../src/scraper/client");

const cut = (text, n) => {
  const s = String(text ?? "");
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};
const pad = (text, n) => cut(text, n).padEnd(n);

function dates(row) {
  const marks = [
    row.startYearInferred && "start year guessed",
    row.endYearInferred && "end year guessed",
    row.startApproximated && "start = fetch date",
    row.endEstimated && "end estimated",
    row.versionRef && `${row.versionRef.kind} ${row.versionRef.version}`,
  ].filter(Boolean);
  return `${row.start || "?"} → ${row.end || "?"}${marks.length ? ` (${marks.join(", ")})` : ""}`;
}

function print(result) {
  const { counts } = result;
  console.log(`\n${"=".repeat(100)}\n${result.game} (game ${result.gameId}), today ${result.today}, ${result.requests} requests`);

  console.log("\n1. Pages");
  for (const [page, url] of Object.entries(result.pages)) console.log(`   ${pad(page, 8)} ${url}`);

  console.log("\n2. Versions");
  for (const v of result.versions) {
    const role = v === result.currentVersion ? "current" : v === result.nextVersion ? "next" : v.teaser ? "teaser" : "";
    const times = [v.endDate && `ends ${v.endDate}`, v.releaseAt && `live ${v.releaseAt}`, v.maintenanceStartAt && `maintenance ${v.maintenanceStartAt}`];
    console.log(`   ${pad(v.version, 6)} ${pad(v.releaseDate || "no date", 11)} ${pad(role, 8)} ${times.filter(Boolean).join(", ")}`);
  }

  console.log(`\n3. Raw rows per section (${counts.raw})`);
  const sections = new Map();
  for (const r of result.raw) {
    const key = `${r.source} / ${r.section} (${r.status})`;
    sections.set(key, (sections.get(key) || 0) + 1);
  }
  for (const [key, n] of sections) console.log(`   ${String(n).padStart(3)}  ${key}`);

  console.log(`\n4. Merged events (${counts.merged}): outcome · dates · type · daily · sources`);
  const order = { valid: 0, pending: 1, invalid: 2, dropped: 3 };
  const rows = [...result.rows].sort((a, b) => order[a.outcome] - order[b.outcome] || String(a.start).localeCompare(String(b.start)));
  for (const r of rows) {
    const outcome = r.outcome === "valid" ? "valid" : `${r.outcome}: ${r.reason}`;
    console.log(`   ${pad(r.name, 42)} ${pad(outcome, 30)} ${dates(r)}`);
    const daily = r.daily ? `daily (${r.dailyReason})` : "not daily";
    console.log(`   ${" ".repeat(42)} ${pad(`${r.eventType} (${r.typeReason})`, 30)} ${daily} · ${r.image ? "img" : "no img"} · ${(r.sources || [`${r.source}/${r.section}`]).join(" + ")}`);
  }

  console.log(
    `\n5. Summary: ${counts.valid} valid, ${counts.pending} pending, ${counts.invalid} invalid, ${counts.dropped} dropped` +
      `${counts.withoutImage ? ` (${counts.withoutImage} valid without image)` : ""}`,
  );
  if (result.warnings.length) {
    console.log("\nWarnings:");
    result.warnings.forEach((w) => console.log(`   ${w}`));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const target = args.find((a) => !a.startsWith("--") && a !== "--game") || args[args.indexOf("--game") + 1];
  if (!target) {
    console.error(`Usage: npm run scraper:diagnose -- <${games.map((g) => g.key).join(" | ")} | all> [--json]`);
    process.exit(1);
  }
  const selected = target === "all" ? games.filter((g) => g.enabled) : [byKey(target)];
  if (!selected[0]) throw new Error(`No game config "${target}"`);

  const client = createClient(); // shared, so the delay applies across games
  let failed = 0;
  for (const config of selected) {
    try {
      const result = await new EventScraper(config, { client }).collect();
      if (json) console.log(JSON.stringify(result, null, 2));
      else print(result);
    } catch (error) {
      failed++;
      console.error(`\n✗ ${config.key}: ${error.name}: ${error.message}`);
      if (error.fileHint) console.error(`  look at: ${error.fileHint}`);
      if (error.context?.url) console.error(`  page: ${error.context.url}`);
      if (error.context?.rowHtml) console.error(`  row: ${error.context.rowHtml}`);
    }
  }
  if (failed) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`${error.name}: ${error.message}`);
  process.exit(1);
});
