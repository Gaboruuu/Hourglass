const cron = require("node-cron");
const { syncEvents } = require("./sync");

/**
 * Schedule daily event synchronization
 * Runs at 3:00 AM every day
 */
function startScheduler() {
  console.log("Event sync scheduler started");
  console.log("Will run daily at 3:00 AM");

  // Run at 3:00 AM every day
  cron.schedule("0 3 * * *", async () => {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] Starting scheduled event sync...`);

    try {
      const result = await syncEvents();
      console.log(
        `\n[${timestamp}] Sync completed successfully:`,
        `${result.importedCount} new events imported, ${result.existingCount} existing events`,
      );
    } catch (error) {
      console.error(`\n[${timestamp}] Sync failed:`, error.message);
    }
  });

  // Optionally run once immediately on startup
  console.log("\nRunning initial sync...");
  syncEvents()
    .then((result) => {
      console.log(
        `\nInitial sync completed: ${result.importedCount} new events imported, ${result.existingCount} existing events`,
      );
      console.log("\nScheduler is now active. Press Ctrl+C to stop.");
    })
    .catch((error) => {
      console.error("\nInitial sync failed:", error.message);
      console.log("\nScheduler is still active. Press Ctrl+C to stop.");
    });
}

// Start the scheduler if this file is run directly
if (require.main === module) {
  startScheduler();
}

module.exports = { startScheduler };
