const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "../..");

function readJson(file, key) {
  try {
    const fullPath = path.join(ROOT, file);
    if (fs.existsSync(fullPath)) {
      return JSON.parse(fs.readFileSync(fullPath, "utf8"))[key] || [];
    }
  } catch (error) {
    console.warn(`Could not load ${file}: ${error.message}`);
  }
  return [];
}

const loadIgnoredEvents = () => readJson("ignored-events.json", "ignoredEvents");
const loadDailyEvents = () => readJson("daily-events.json", "daily_events");

function matchesConfig(eventName, gameId, entries) {
  return entries.some(
    (entry) =>
      String(entry.gameId) === String(gameId) &&
      eventName.toLowerCase().includes(entry.eventName.toLowerCase()),
  );
}

/**
 * Append events that couldn't be imported to invalid-events.json (uploaded by CI).
 */
function saveInvalidEvents(game, source, events, file = path.join(ROOT, "invalid-events.json")) {
  if (events.length === 0) return;
  let existing = [];
  try {
    if (fs.existsSync(file)) existing = JSON.parse(fs.readFileSync(file, "utf8") || "[]");
  } catch (error) {
    console.warn(`Could not parse existing invalid-events.json: ${error.message}`);
  }
  existing.push({ timestamp: new Date().toISOString(), gameId: game.id, gameTag: game.tag, source, events });
  fs.writeFileSync(file, JSON.stringify(existing, null, 2), "utf8");
  console.log(`\n⚠ ${events.length} invalid events saved to invalid-events.json`);
}

module.exports = {
  loadIgnoredEvents,
  loadDailyEvents,
  shouldIgnoreEvent: matchesConfig,
  isDailyEvent: matchesConfig,
  saveInvalidEvents,
};
