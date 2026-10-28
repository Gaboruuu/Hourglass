const { versionDates } = require("./src/config/versionDates");
const {
  fetchHoyoverseEventsNotice,
  fetchHoyoverseEventsCalendar,
} = require("./src/api/hoyoverse");
const { fetchWuWaEvents } = require("./src/api/wuwa");
const { filterBackendValid } = require("./src/services/eventValidation");
const {
  fixEventDates,
  batchCheckEvents,
  createEvent,
} = require("./src/services/eventService");
const { BACKEND_URL, getSyncApiKey } = require("./src/config/backend");
const fs = require("fs");
const path = require("path");

const GAMES = [
  // { id: "1", tag: "honkai" },
  { id: "2", tag: "zenless" },
  { id: "3", tag: "starrail" },
  { id: "4", tag: "genshin" },
  { id: "5", tag: "wuwa" }, // Wuthering Waves
];

async function syncEvents() {
  // Fail before fetching anything if the backend credential is missing
  getSyncApiKey();

  // Clear invalid-events.json at the start of each sync
  const invalidEventsPath = path.join(__dirname, "invalid-events.json");
  if (fs.existsSync(invalidEventsPath)) {
    fs.unlinkSync(invalidEventsPath);
    console.log("Cleared previous invalid-events.json\n");
  }

  const allEvents = [];
  // Problems that need a human (source blocked, layout changed, API down). Reported at the end.
  const failures = [];

  for (const game of GAMES) {
    console.log(`Fetching events for: ${game.tag}`);
    let events;

    try {
      if (game.id === "5") {
        // Wuthering Waves uses Fandom Wiki scraper
        events = await fetchWuWaEvents(game);
      } else if (game.id === "2") {
        // Zenless Zone Zero uses notices endpoint
        events = await fetchHoyoverseEventsNotice(game);
      } else {
        // Other Hoyoverse games use calendar endpoint
        events = await fetchHoyoverseEventsCalendar(game);
      }
    } catch (error) {
      // One broken source shouldn't stop the other games from syncing
      console.error(`✗ Failed to fetch ${game.tag}: ${error.message}`);
      failures.push({ game: game.tag, source: "all", error });
      continue;
    }

    console.log(`Fetched ${events.length} events for ${game.tag}`);
    allEvents.push(...events);
  }

  console.log(`\n✓ Total valid events fetched: ${allEvents.length}`);

  // Only send what the backend accepts: one rejected event would otherwise fail the whole
  // batch-check (nothing imported that day) or fail the run every day. Skipped events go to
  // invalid-events.json without failing the run, like the fetchers' own invalid events.
  const { valid: eventsToCheck } = filterBackendValid(allEvents, invalidEventsPath);

  console.log(`\nSample event:\n`, eventsToCheck[0]);
  // Batch check which events are new
  console.log("\nChecking for new events...");
  const checkResult = await batchCheckEvents(eventsToCheck, BACKEND_URL);

  if (!checkResult || !checkResult.existing || !checkResult.new) {
    throw new Error(
      "Invalid response from batch check. Is the backend running?",
    );
  }

  console.log(`\n✓ ${checkResult.existing.length} events already exist`);
  console.log(`✓ ${checkResult.new.length} new events to import`);

  // Import new events to database
  if (checkResult.new.length > 0) {
    console.log(`\nImporting ${checkResult.new.length} new events...`);
    let successCount = 0;
    let failCount = 0;

    for (const event of checkResult.new) {
      try {
        await createEvent(event, BACKEND_URL);
        successCount++;
      } catch (error) {
        console.error(
          `Failed to import event "${event.event_name}":`,
          error.message,
        );
        failCount++;
      }
    }

    console.log(`\n✓ Successfully imported ${successCount} events`);
    if (failCount > 0) {
      console.log(`✗ Failed to import ${failCount} events`);
      // Rejected writes (bad data, or a 401/403 after a key change) need a look, so fail the run
      const error = new Error(`${failCount} event(s) were rejected by the backend, see the run log`);
      error.name = "BackendWriteError";
      failures.push({ game: "all", source: "backend", error });
    }
  } else {
    console.log(`\nNo new events to import.`);
  }

  reportFailures(failures);

  return {
    failures,
    allEvents,
    newEvents: checkResult.new,
    existingCount: checkResult.existing.length,
    importedCount: checkResult.new.length,
  };
}

/**
 * Write sync-errors.md (used by the workflow as the GitHub issue body) and fail the process.
 */
function reportFailures(failures) {
  const errorsPath = path.join(__dirname, "sync-errors.md");
  if (fs.existsSync(errorsPath)) fs.unlinkSync(errorsPath);
  if (failures.length === 0) return;

  const hints = {
    BackendAuthError:
      "The backend refused the sync's API key. Check that the GitHub secret `SYNC_API_KEY` is in Render's `SYNC_API_KEYS`.",
  };
  const body = failures
    .map(({ game, source, error }) =>
      [`### ${game} (${source})`, `**${error.name}**: ${error.message}`, hints[error.name] || ""].join("\n\n"),
    )
    .join("\n\n");
  fs.writeFileSync(errorsPath, `The daily event sync hit ${failures.length} problem(s).\n\n${body}\n`, "utf8");

  console.error(`\n✗ ${failures.length} source(s) failed, see sync-errors.md`);
  process.exitCode = 1;
}

module.exports = { syncEvents };

// Only run if executed directly (not imported)
if (require.main === module) {
  syncEvents().catch((error) => {
    console.error("Error syncing events:", error);
    // A 401/403 from the backend means the key is missing or not accepted
    if (/status 40[13]\b/.test(error.message)) error.name = "BackendAuthError";
    reportFailures([{ game: "all", source: "sync", error }]);
  });
}

