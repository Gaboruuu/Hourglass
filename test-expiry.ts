import permanentEventsManager from "./Hourglass/data/permanentEvents/PermanentEventsManager";

// Mock timezone settings for Europe/Bucharest (UTC+3 for summer)
permanentEventsManager.setRegion("europe", 1, 4);

// Call updateExpirationDates to calculate
const events = permanentEventsManager.getAllEvents();
const event = events.find(e => e.event_id === "hi3_abyss");

console.log(event?.expiry_date);
