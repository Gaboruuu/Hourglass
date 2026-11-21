/** Every game config. A game is only scraped when `enabled: true`. */
const games = [require("./genshin"), require("./starrail"), require("./zenless"), require("./wuwa")];

const byKey = (key) => games.find((g) => g.key === key || String(g.gameId) === String(key)) || null;

module.exports = { games, byKey };
