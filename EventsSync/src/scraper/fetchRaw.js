/**
 * The fetch + extract half of the pipeline for one game (1b): home page → discovered pages →
 * raw rows per section, plus the version info. Dates are still text here; parsing, matching and
 * classification happen in EventScraper (1c).
 */
const cheerio = require("cheerio");
const { discoverPages, discoverVersionLinks, homeUrl } = require("./discover");
const { extractSection } = require("./extract");
const { collectVersions } = require("./versionPage");

/**
 * fetchRaw(config, client, { today }) → { pages, rows, versions, warnings }
 * Throws SourceBlockedError / SourceLayoutError when a required page or section is broken.
 */
async function fetchRaw(config, client, { today }) {
  const warnings = [];
  const homeHtml = await client.get(homeUrl(config));
  const discovered = discoverPages(config, homeHtml);
  warnings.push(...discovered.warnings);
  const { pages } = discovered;

  const loaded = new Map();
  const load = async (page) => {
    if (!pages[page]) throw new Error(`section uses page "${page}", which isn't in the ${config.key} config`);
    if (!loaded.has(page)) loaded.set(page, cheerio.load(page === "home" ? homeHtml : await client.get(pages[page])));
    return loaded.get(page);
  };

  const rows = [];
  for (const section of config.sections) {
    const $ = await load(section.page);
    const result = extractSection($, section, { game: config.key, url: pages[section.page] });
    rows.push(...result.rows);
    warnings.push(...result.warnings);
  }

  const versionLinks = discoverVersionLinks(config, homeHtml);
  if (config.version && versionLinks.length === 0) warnings.push(`no home-page link matches ${config.version.find}`);
  const versionResult = config.version
    ? await collectVersions(config, client, versionLinks, { today })
    : { versions: [], warnings: [] };
  warnings.push(...versionResult.warnings);

  return { pages, rows, versions: versionResult.versions, warnings };
}

module.exports = { fetchRaw };
