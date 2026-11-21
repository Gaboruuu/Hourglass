/** Shared test helpers: load a synthetic fixture with {{IMG}} pointing at the source's image host */
const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");
const source = require("../src/scraper/source");

const IMG = `https://${source.imageHost}/test`;

function fixture(name) {
  return fs.readFileSync(path.join(__dirname, "fixtures", name), "utf8").replaceAll("{{IMG}}", IMG);
}

const load$ = (name) => cheerio.load(fixture(name));

module.exports = { fixture, load$, IMG };
