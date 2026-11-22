/**
 * The run report as Markdown: printed to the console, written to sync-report.md (a CI artifact)
 * and appended to the GitHub job summary ($GITHUB_STEP_SUMMARY) when it runs in Actions.
 */
const fs = require("fs");

const esc = (text) => String(text ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
const names = (rows, n = 15) => {
  const list = rows.slice(0, n).map((r) => `${esc(r.event_name)} (${r.start_date} → ${r.expiry_date})`);
  return rows.length > n ? [...list, `… ${rows.length - n} more`] : list;
};

function summaryTable(result) {
  const lines = [
    "| Game | Writes to DB | Scraper: valid | new | in DB | pending | invalid | dropped | Old source: events | new | Inserted |",
    "|---|---|---|---|---|---|---|---|---|---|---|",
  ];
  for (const g of result.perGame) {
    const s = g.scraper;
    const c = s?.counts;
    const scraperCells = s
      ? [c.valid, g.scraperNew.length, g.scraperExisting.length, c.pending, c.invalid, c.dropped]
      : ["✗ failed", "", "", "", "", ""];
    const legacyCells = g.live ? ["–", "–"] : g.legacy ? [g.legacy.length, g.legacyNew.length] : ["✗ failed", ""];
    const inserted = result.dryRun ? `(dry run: ${g.wouldInsert.length})` : g.inserted.length;
    lines.push(`| ${g.game} | ${g.live ? "**scraper**" : "old source (shadow)"} | ${[...scraperCells, ...legacyCells, inserted].join(" | ")} |`);
  }
  return lines.join("\n");
}

function gameSection(g, result) {
  const out = [`### ${g.game} (${g.live ? "live: the scraper writes" : "shadow: the old source writes"})`];
  if (g.scraperError) out.push(`- **Scraper failed:** ${g.scraperError.name}: ${esc(g.scraperError.message)}${g.scraperError.fileHint ? ` → look at \`${g.scraperError.fileHint}\`` : ""}`);
  if (g.legacyError) out.push(`- **Old source failed:** ${esc(g.legacyError.message)}`);

  const s = g.scraper;
  if (s) {
    if (s.currentVersion) {
      const next = s.nextVersion ? `, next ${s.nextVersion.version} on ${s.nextVersion.releaseDate}` : "";
      out.push(`- Version: ${s.currentVersion.version} since ${s.currentVersion.releaseDate}${next}`);
    }
    const label = g.live ? (result.dryRun ? "Would insert" : "Inserted") : "Scraper would insert (after the switch)";
    const rows = g.live ? (result.dryRun ? g.wouldInsert : g.inserted) : g.scraperNew;
    if (rows.length) out.push(`- ${label}: ${names(rows).join(", ")}`);
    for (const r of s.pending) out.push(`- Pending: ${esc(r.name)}: ${esc(r.reason)}`);
    for (const r of s.invalid) out.push(`- **Invalid:** ${esc(r.name)}: ${esc(r.reason)}`);
    for (const w of s.warnings) out.push(`- Warning: ${esc(w)}`);
  }

  if (!g.live && g.legacy) {
    if (g.legacyNew.length && !result.dryRun) out.push(`- Old source inserted: ${names(g.legacyNew).join(", ")}`);
    if (result.dryRun && g.legacyNew.length) out.push(`- Old source would insert: ${names(g.legacyNew).join(", ")}`);
  }

  const cmp = g.comparison;
  if (cmp) {
    const mismatched = cmp.matched.filter((m) => !m.sameDates);
    out.push(
      `- **Comparison:** ${cmp.matched.length} matched (${mismatched.length} with different dates), ` +
        `${cmp.onlyScraper.length} only in the scraper, ${cmp.onlyLegacy.length} only in the old source`,
    );
    for (const m of mismatched) {
      out.push(
        `  - dates differ: ${esc(m.scraper.event_name)}: scraper ${m.scraper.start_date} → ${m.scraper.expiry_date}, old ${m.legacy.start_date} → ${m.legacy.expiry_date}`,
      );
    }
    if (cmp.onlyScraper.length) out.push(`  - only scraper: ${names(cmp.onlyScraper).join(", ")}`);
    if (cmp.onlyLegacy.length) out.push(`  - only old source: ${names(cmp.onlyLegacy).join(", ")}`);
  }
  if (g.aliasCandidates?.length) {
    out.push("- **Alias candidates** (same event, the DB has the old name; add to `event-aliases.json` before switching this game):");
    out.push("```json");
    out.push(g.aliasCandidates.map((a) => `    ${JSON.stringify(a)}`).join(",\n"));
    out.push("```");
  }
  return out.join("\n");
}

function buildReport(result) {
  const head = `## Event sync ${result.today}${result.dryRun ? " (dry run: nothing written)" : ""}`;
  const failures = result.failures.length
    ? `\n**${result.failures.length} problem(s):** ${result.failures.map((f) => `${f.game} (${f.source}): ${esc(f.error.message)}`).join("; ")}\n`
    : "";
  const totals = result.dryRun
    ? `${result.toInsert.length} event(s) would be inserted; ${result.checked} checked against the DB.`
    : `${result.insertedCount} event(s) inserted; ${result.checked} checked against the DB.`;
  return [head, failures, summaryTable(result), "", totals, "", ...result.perGame.map((g) => gameSection(g, result))].join("\n");
}

/** sync-report.md + the GitHub job summary */
function writeReport(markdown, { file, summaryFile = process.env.GITHUB_STEP_SUMMARY } = {}) {
  if (file) fs.writeFileSync(file, `${markdown}\n`, "utf8");
  if (summaryFile) fs.appendFileSync(summaryFile, `${markdown}\n`, "utf8");
}

module.exports = { buildReport, writeReport };
