const { syncEvents } = require("./sync");
/**
 * Test the Hoyoverse API with one game
 */
async function testHoyoverseAPI() {
  try {
    console.log("Starting Hoyoverse API test...\n");
    await syncEvents();
  } catch (error) {
    console.error("Error during Hoyoverse API test:", error);
  }
}

// Run the test
testHoyoverseAPI();
