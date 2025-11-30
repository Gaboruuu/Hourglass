import { scrapeFandomEvents } from "../../data/AutoEventsManager";

async function debug() {
  const url = "https://wutheringwaves.fandom.com/wiki/Event";
  const events = await scrapeFandomEvents(url);

  console.log(`\nFound ${events.length} events:\n`);
  events.forEach((e, i) => {
    console.log(`${i + 1}. ${e.name}`);
    console.log(`   URL: ${e.sourceUrl}`);
    console.log(`   Image: ${e.imageUrl ? "Yes" : "No"}`);
    console.log(`   Dates: ${e.startDate} to ${e.endDate}`);
    console.log();
  });
}

debug().catch(console.error);
