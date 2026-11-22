const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { games, byKey } = require("../src/scraper/games");

const LAYOUTS = ["range", "multiPerRow", "splitRows", "headingPerEvent"];

test("game configs are complete and consistent", () => {
  const ids = new Set();
  for (const game of games) {
    const file = path.join(__dirname, "..", "src", "scraper", "games", `${game.key}.js`);
    assert.ok(fs.existsSync(file), `${game.key}: key must match its file name (error hints point there)`);
    assert.ok(Number.isInteger(game.gameId) && !ids.has(game.gameId), `${game.key}: unique gameId`);
    ids.add(game.gameId);
    assert.ok(game.slug, `${game.key}: slug`);
    assert.ok(game.version?.find instanceof RegExp, `${game.key}: version.find`);
    assert.ok(Array.isArray(game.version.release) && game.version.release.length, `${game.key}: version.release rules`);

    const pages = new Set(["home", ...Object.keys(game.pages || {})]);
    for (const section of game.sections) {
      const where = `${game.key} ${section.heading}`;
      assert.ok(pages.has(section.page), `${where}: page "${section.page}" isn't in pages`);
      assert.ok(LAYOUTS.includes(section.layout), `${where}: layout "${section.layout}"`);
      assert.ok(["ongoing", "upcoming"].includes(section.status), `${where}: status`);
      assert.ok(section.heading instanceof RegExp, `${where}: heading must be a regex`);
    }
    assert.ok(
      game.sections.some((s) => s.status === "ongoing" && !s.optional),
      `${game.key}: at least one required ongoing section (so a renamed page is noticed)`,
    );
  }
});

test("byKey finds a game by key or game id", () => {
  assert.strictEqual(byKey("wuwa").gameId, 5);
  assert.strictEqual(byKey(4).key, "genshin");
  assert.strictEqual(byKey("nope"), null);
});
