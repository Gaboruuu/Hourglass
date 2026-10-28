const fs = require("fs");

/**
 * The backend's rules for POST /events (BackEnd/src/schemas/event.schema.js), checked before
 * anything is sent. The backend validates a whole batch-check request at once, so a single event
 * it would reject (e.g. "2026-1-5", which Date.parse accepts) would otherwise fail the entire day's
 * sync, and an event it rejects on POST would fail the run every day until the source changes.
 * Keep these in line with the backend schema.
 */
const EVENT_TYPES = ["main", "side"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value) {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

/** Returns the reasons the backend would reject this event (empty array = OK) */
function getBackendProblems(event) {
  const problems = [];
  const name = typeof event.event_name === "string" ? event.event_name.trim() : "";

  if (!Number.isInteger(event.game_id) || event.game_id <= 0) problems.push("game_id is not a positive integer");
  if (name.length === 0 || name.length > 255) problems.push("event_name is empty or longer than 255 characters");
  if (!isIsoDate(event.start_date)) problems.push(`start_date "${event.start_date}" is not a YYYY-MM-DD date`);
  if (!isIsoDate(event.expiry_date)) problems.push(`expiry_date "${event.expiry_date}" is not a YYYY-MM-DD date`);
  if (isIsoDate(event.start_date) && isIsoDate(event.expiry_date) && event.start_date > event.expiry_date) {
    problems.push("start_date is after expiry_date");
  }
  if (!EVENT_TYPES.includes(event.event_type)) problems.push(`event_type "${event.event_type}" is not one of ${EVENT_TYPES.join("/")}`);
  if (![0, 1, true, false, undefined].includes(event.daily_login)) problems.push("daily_login is not 0/1");

  const url = event.background_url;
  if (url !== null && url !== undefined) {
    let valid = false;
    try {
      valid = typeof url === "string" && url.length <= 2048 && new URL(url).protocol === "https:";
    } catch {
      valid = false;
    }
    if (!valid) problems.push("background_url is not an https URL");
  }

  return problems;
}

/**
 * Splits events into the ones the backend accepts and the ones it would reject.
 * Rejected events are added to invalid-events.json (uploaded by CI) with their reasons.
 */
function filterBackendValid(events, invalidEventsPath) {
  const valid = [];
  const rejected = [];

  for (const event of events) {
    const problems = getBackendProblems(event);
    if (problems.length === 0) valid.push(event);
    else rejected.push({ ...event, reasons: problems });
  }

  if (rejected.length > 0) {
    let existing = [];
    try {
      if (fs.existsSync(invalidEventsPath)) existing = JSON.parse(fs.readFileSync(invalidEventsPath, "utf8") || "[]");
    } catch (error) {
      console.warn(`Could not parse existing invalid-events.json: ${error.message}`);
    }
    existing.push({ timestamp: new Date().toISOString(), source: "backend-rules", events: rejected });
    fs.writeFileSync(invalidEventsPath, JSON.stringify(existing, null, 2), "utf8");

    console.warn(`\n⚠ ${rejected.length} event(s) skipped because the backend would reject them (see invalid-events.json):`);
    for (const event of rejected) {
      console.warn(`  - [game ${event.game_id}] "${event.event_name}": ${event.reasons.join("; ")}`);
    }
  }

  return { valid, rejected };
}

module.exports = { getBackendProblems, filterBackendValid, isIsoDate };
