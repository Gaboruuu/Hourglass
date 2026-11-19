const { request } = require("undici");

async function debugGenshinCalendar() {
  const url = "https://api.ennead.cc/mihoyo/genshin/calendar";
  console.log(`Fetching from: ${url}\n`);

  try {
    const { body } = await request(url, {
      method: "GET",
      headers: {
        "User-Agent": "Hourglass-EventsSync/1.0",
        Accept: "application/json",
      },
    });

    const text = await body.text();
    const data = JSON.parse(text);

    console.log("Events from calendar:");
    console.log("====================\n");

    if (data.events) {
      data.events.forEach((event, index) => {
        console.log(`Event ${index + 1}: ${event.name}`);
        console.log(`  start_time: ${event.start_time}`);
        console.log(`  end_time: ${event.end_time}`);
        console.log(
          `  start_time as date: ${event.start_time ? new Date(event.start_time * 1000).toISOString() : "N/A"}`,
        );
        console.log(
          `  end_time as date: ${event.end_time ? new Date(event.end_time * 1000).toISOString() : "N/A"}`,
        );
        console.log(`  type_name: ${event.type_name}`);
        console.log(`  special_reward: ${event.special_reward}`);
        console.log("---");
      });
    } else {
      console.log("No events found in response");
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

debugGenshinCalendar();
