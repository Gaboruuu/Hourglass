/**
 * Reading version pages (1b): release date, version end date (when the page gives the schedule),
 * and the exact release time in UTC when the page lists it. The version logic itself is versions.js.
 *
 * config.version:
 *   find         home-page link text; the first capture group that matched = version number
 *   release      rules, first one that gives a date wins:
 *                  { row: /label/ }       a table row labelled like this; its latest date (HSR: NA vs EU/Asia date → EU/Asia)
 *                  { schedule: /label/ }  a row with the version's whole range → releaseDate + endDate
 *                  { heading: /regex/ }   a heading with the date in it ("Released on November 4, 2026")
 *   releaseTime  "serverTable"            rows labelled Asia / Europe / North America with "date time[~time] (UTC/GMT±N)"
 *                { text: /…(time)…(UTC±N)/ } a sentence on the page (group 1 = time, group 2 = offset)
 *   cadenceDays  version length used for estimates
 *
 * Result: { version, url, releaseDate, endDate, releaseAt, maintenanceStartAt, teaser, warnings }
 * The times are captured for Phase 2; nothing is sent to the backend in Phase 1.
 */
const cheerio = require("cheerio");
const { allDates, parseServerTime } = require("./dates");
const { textOf } = require("./extract");
const { compareVersions } = require("./versions");

const SERVER_ROW = /^(asia|europe|north america|america)\b/i;

function rows($) {
  return $("tr")
    .toArray()
    .map((tr) => $(tr).children("th, td").toArray().map((cell) => textOf($, cell)))
    .filter((cells) => cells.length >= 2);
}

/** A row label that names a version ("Version 3.8 Schedule") only counts on that version's page */
function labelFits(label, version) {
  const named = /(\d+\.\d+)/.exec(label);
  return !named || !version || compareVersions(named[1], version) === 0;
}

function readReleaseDate($, rules, version) {
  for (const rule of rules || []) {
    if (rule.row || rule.schedule) {
      const label = rule.row || rule.schedule;
      const row = rows($).find((cells) => label.test(cells[0]) && labelFits(cells[0], version));
      const dates = row ? allDates(row.slice(1).join(" ")) : [];
      if (dates.length === 0) continue;
      if (rule.schedule) return { releaseDate: dates[0], endDate: dates[1] || null };
      return { releaseDate: [...dates].sort().pop(), endDate: null };
    }
    if (rule.heading) {
      const heading = $("h2, h3, h4")
        .toArray()
        .map((h) => textOf($, h))
        .find((text) => rule.heading.test(text));
      const dates = heading ? allDates(heading) : [];
      if (dates.length) return { releaseDate: dates[0], endDate: null };
    }
  }
  return { releaseDate: null, endDate: null };
}

function readReleaseTime($, setting, releaseDate, warnings) {
  if (!setting || !releaseDate) return { releaseAt: null, maintenanceStartAt: null };

  if (setting === "serverTable") {
    const servers = rows($)
      .filter((cells) => SERVER_ROW.test(cells[0]))
      .map((cells) => ({ server: cells[0], parsed: parseServerTime(cells.slice(1).join(" ")) }))
      .filter((s) => s.parsed && s.parsed.times.length);
    if (servers.length === 0) {
      warnings.push("release time: no server time rows found");
      return { releaseAt: null, maintenanceStartAt: null };
    }
    const pick = (s) =>
      s.parsed.times.length >= 2
        ? { releaseAt: s.parsed.times[1], maintenanceStartAt: s.parsed.times[0] }
        : { releaseAt: s.parsed.times[0], maintenanceStartAt: null };
    const all = servers.map(pick);
    // Updates go live at the same moment everywhere: the rows must agree
    if (new Set(all.map((t) => t.releaseAt)).size > 1) {
      warnings.push(`release time: server rows disagree (${all.map((t) => t.releaseAt).join(", ")}), using the first`);
    }
    return all[0];
  }

  if (setting.text) {
    const match = setting.text.exec(textOf($, $("body")));
    const parsed = match ? parseServerTime(`${releaseDate} ${match[1]} (${match[2]})`) : null;
    if (!parsed || parsed.times.length === 0) {
      warnings.push("release time: sentence not found");
      return { releaseAt: null, maintenanceStartAt: null };
    }
    return { releaseAt: parsed.times[0], maintenanceStartAt: null };
  }
  return { releaseAt: null, maintenanceStartAt: null };
}

/** Read one version page. A page without a release date is a teaser (ignored by the version logic) */
function readVersionPage(html, versionConfig, { version, url } = {}) {
  const $ = cheerio.load(html);
  const warnings = [];
  const { releaseDate, endDate } = readReleaseDate($, versionConfig.release, version);
  const time = readReleaseTime($, versionConfig.releaseTime, releaseDate, warnings);
  return { version, url, releaseDate, endDate, ...time, teaser: !releaseDate, warnings };
}

/**
 * Fetch version pages newest first until one is already released (that's the current version).
 * Usually 1–2 requests: the next (announced) version, then the current one. At most `limit`.
 */
async function collectVersions(config, client, versionLinks, { today, limit = 4 }) {
  const versions = [];
  const warnings = [];
  for (const link of versionLinks.slice(0, limit)) {
    const info = readVersionPage(await client.get(link.url), config.version, link);
    versions.push(info);
    warnings.push(...info.warnings.map((w) => `version ${link.version}: ${w}`));
    if (info.releaseDate && info.releaseDate <= today) break;
  }
  if (!versions.some((v) => v.releaseDate && v.releaseDate <= today)) {
    warnings.push("no released version found on the version pages (version-relative dates won't resolve)");
  }
  return { versions, warnings };
}

module.exports = { readVersionPage, collectVersions };
