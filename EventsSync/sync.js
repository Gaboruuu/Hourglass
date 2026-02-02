const { versionDates } = require("./src/config/versionDates");
const {
  fetchHoyoverseEventsNotice,
  fetchHoyoverseEventsCalendar,
} = require("./src/api/hoyoverse");
const {
  fixEventDates,
  batchCheckEvents,
  createEvent,
} = require("./src/services/eventService");
const fs = require("fs");
const path = require("path");

const BACKEND_URL = "https://hourglass-h6zo.onrender.com/api";
// const BACKEND_URL = "http://localhost:8080/api";

const GAMES = [
  // { id: "1", tag: "honkai" },
  { id: "2", tag: "zenless" },
  { id: "3", tag: "starrail" },
  { id: "4", tag: "genshin" },
];

async function syncEvents() {
  // Clear invalid-events.json at the start of each sync
  const invalidEventsPath = path.join(__dirname, "invalid-events.json");
  if (fs.existsSync(invalidEventsPath)) {
    fs.unlinkSync(invalidEventsPath);
    console.log("Cleared previous invalid-events.json\n");
  }

  const allEvents = [];

  for (const game of GAMES) {
    console.log(`Fetching events for: ${game.tag}`);
    const events =
      game.id === "2"
        ? await fetchHoyoverseEventsNotice(game)
        : await fetchHoyoverseEventsCalendar(game);
    console.log(`Fetched ${events.length} events for ${game.tag}`);
    allEvents.push(...events);
  }

  console.log(`\n✓ Total valid events fetched: ${allEvents.length}`);
  console.log(`\nSample event:\n`, allEvents[119]);
  // Batch check which events are new
  console.log("\nChecking for new events...");
  const checkResult = await batchCheckEvents(allEvents, BACKEND_URL);

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
    }
  } else {
    console.log(`\nNo new events to import.`);
  }

  return {
    allEvents,
    newEvents: checkResult.new,
    existingCount: checkResult.existing.length,
    importedCount: checkResult.new.length,
  };
}

module.exports = { syncEvents };

// Only run if executed directly (not imported)
if (require.main === module) {
  syncEvents().catch((error) => {
    console.error("Error syncing events:", error);
  });
}
