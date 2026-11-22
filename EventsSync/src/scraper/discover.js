/**
 * Page URLs from the game's home page links, so most "the source moved a page" changes fix
 * themselves. Each page in the config has `find` (link text regex) and `url` (fallback).
 * Version pages are found the same way: `version.find` captures the version number.
 */
const cheerio = require("cheerio");
const source = require("./source");
const { absoluteUrl } = require("./client");
const { compareVersions, parseVersion } = require("./versions");
const { SourceLayoutError } = require("./errors");

const clean = (text) => String(text ?? "").replace(/\s+/g, " ").trim();

/** Every link on the page as { text, url } (no in-page #anchors) */
function links(html) {
  const $ = cheerio.load(html);
  return $("a[href]")
    .toArray()
    .map((a) => ({ text: clean($(a).text()), href: $(a).attr("href") }))
    .filter(({ text, href }) => text && href && !href.startsWith("#"))
    .map(({ text, href }) => ({ text, url: absoluteUrl(href) }));
}

function homeUrl(config) {
  return absoluteUrl(source.gamePath(config.slug));
}

/**
 * { home, <page>: url, … } for every page in config.pages. Uses the config `url` when no link
 * matches (with a warning). Throws SourceLayoutError when neither exists.
 */
function discoverPages(config, homeHtml) {
  const all = links(homeHtml);
  const pages = { home: homeUrl(config) };
  const warnings = [];
  for (const [key, page] of Object.entries(config.pages || {})) {
    const found = page.find && all.find((l) => page.find.test(l.text) && l.url.includes(config.slug));
    if (found) pages[key] = found.url;
    else if (page.url) {
      pages[key] = absoluteUrl(page.url);
      warnings.push(`${key} page: no home-page link matches ${page.find}, using the config url`);
    } else {
      throw new SourceLayoutError(`${key} page not found (no link matches ${page.find})`, { game: config.key, page: "home", url: pages.home });
    }
  }
  return { pages, warnings };
}

/** Version pages linked from the home page: [{ version, url }], newest first, one per version */
function discoverVersionLinks(config, homeHtml) {
  const re = config.version?.find;
  if (!re) return [];
  const byVersion = new Map();
  for (const link of links(homeHtml)) {
    const match = re.exec(link.text);
    const version = match && match.slice(1).find(Boolean); // the first group that matched
    if (!version || !parseVersion(version) || !link.url.includes(config.slug)) continue;
    if (!byVersion.has(version)) byVersion.set(version, { version, url: link.url });
  }
  return [...byVersion.values()].sort((a, b) => compareVersions(b.version, a.version));
}

module.exports = { discoverPages, discoverVersionLinks, homeUrl, links };
