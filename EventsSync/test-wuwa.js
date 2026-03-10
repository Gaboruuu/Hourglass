const { fetchWuWaEvents } = require("./src/api/wuwa");

/**
 * Test the Wuthering Waves API
 */
async function testWuWaAPI() {
  try {
    console.log("Starting Wuthering Waves API test...\n");
    console.log("=".repeat(60));
    
    // Game configuration for Wuthering Waves
    const game = {
      id: "5",
      tag: "wuwa"
    };

    // Fetch events
    const events = await fetchWuWaEvents(game);

    console.log("\n" + "=".repeat(60));
    console.log("\n📊 RESULTS SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total valid events fetched: ${events.length}`);
    
    if (events.length > 0) {
      console.log("\n📝 SAMPLE EVENTS");
      console.log("=".repeat(60));
      
      // Show first 3 events as samples
      const samplesToShow = Math.min(3, events.length);
      for (let i = 0; i < samplesToShow; i++) {
        const event = events[i];
        console.log(`\n${i + 1}. ${event.event_name}`);
        console.log(`   Game ID: ${event.game_id}`);
        console.log(`   Start Date: ${event.start_date}`);
        console.log(`   Expiry Date: ${event.expiry_date}`);
        console.log(`   Event Type: ${event.event_type}`);
        console.log(`   Daily Login: ${event.daily_login ? 'Yes' : 'No'}`);
        console.log(`   Background URL: ${event.background_url ? 'Available' : 'None'}`);
      }
      
      if (events.length > 3) {
        console.log(`\n... and ${events.length - 3} more events`);
      }

      console.log("\n" + "=".repeat(60));
      console.log("\n📄 FULL EVENT LIST (JSON)");
      console.log("=".repeat(60));
      console.log(JSON.stringify(events, null, 2));
    } else {
      console.log("\n⚠ No valid events found");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Test completed successfully!");
    console.log("=".repeat(60) + "\n");

  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ Error during Wuthering Waves API test:");
    console.error("=".repeat(60));
    console.error(error.message);
    console.error("\nStack trace:");
    console.error(error.stack);
    console.error("=".repeat(60) + "\n");
    process.exit(1);
  }
}

// Run the test
testWuWaAPI();
