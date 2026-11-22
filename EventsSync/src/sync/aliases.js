/**
 * event-aliases.json: events already in the DB under an old source's name. While one runs, the
 * scraped name is replaced by the DB name before the DB check, so it isn't inserted a second time.
 */
const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "..", "event-aliases.json");

function loadAliases(file = FILE) {
  try {
    if (!fs.existsSync(file)) return [];
    return JSON.parse(fs.readFileSync(file, "utf8")).aliases || [];
  } catch (error) {
    console.warn(`Could not read ${path.basename(file)}: ${error.message}`);
    return [];
  }
}

/** DB rows with aliased names replaced; `aliasedFrom` keeps the scraped name for the report */
function applyAliases(rows, aliases) {
  return rows.map((row) => {
    const alias = aliases.find(
      (a) =>
        String(a.gameId) === String(row.game_id) &&
        String(a.sourceName).trim().toLowerCase() === String(row.event_name).trim().toLowerCase(),
    );
    return alias ? { ...row, event_name: alias.dbName, aliasedFrom: row.event_name } : row;
  });
}

/** Drop report-only fields before a row goes to the backend (POST /events is strict) */
const forBackend = ({ aliasedFrom, ...row }) => row;

module.exports = { loadAliases, applyAliases, forBackend };
