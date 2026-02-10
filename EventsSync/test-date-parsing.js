/**
 * Test to understand why only some events expire early
 *
 * The issue: Different games use different data sources!
 * - Zenless Zone Zero (game_id 2): Uses NOTICE API with text descriptions
 * - Other games: Use CALENDAR API with timestamps
 */

console.log("=== WHY ONLY SOME EVENTS? ===\n");

// Simulate Zenless Zone Zero notice parsing
console.log("1️⃣ ZENLESS ZONE ZERO (from notices):");
console.log(
  "   API gives: 'Event Duration: 2025/12/31 06:00:00 - 2026/02/05 03:59:00'",
);
console.log("   Parsed end time: 2026/02/05 03:59:00\n");

// The code does this:
const dateStr = "2026/02/05 03:59:00".replace(/\//g, "-").replace(" ", "T");
console.log(`   Converted to: "${dateStr}"`);

const timestamp = Math.floor(new Date(dateStr).getTime() / 1000);
console.log(`   Timestamp: ${timestamp}`);

const dateOnly = new Date(timestamp * 1000).toISOString().split("T")[0];
console.log(`   ⚠️  Stored in DB: "${dateOnly}" (LOSES THE TIME!)`);
console.log(`   The event actually expires at 03:59 AM, not midnight!\n`);

// When frontend checks expiry
console.log("2️⃣ FRONTEND CHECK (with old code):");
const wrongParse = new Date(dateOnly);
console.log(`   new Date("${dateOnly}") = ${wrongParse.toISOString()}`);
console.log(`   In your timezone: ${wrongParse.toLocaleString()}`);
console.log(`   This is 02:00 AM (midnight UTC + 2 hours timezone offset)\n`);

console.log("3️⃣ THE PROBLEM:");
console.log(`   Actual API expiry time: 03:59 AM on Feb 5`);
console.log(`   Stored in DB: "2026-02-05" (no time)`);
console.log(`   Old code parses as: 02:00 AM on Feb 5 (midnight UTC)`);
console.log(`   Result: Event expires 1 hour 59 minutes EARLY!\n`);

console.log("4️⃣ WITH THE FIX:");
const [year, month, day] = dateOnly.split("-").map(Number);
const fixedParse = new Date(year, month - 1, day, 23, 59, 59, 999);
console.log(`   Parsed as: ${fixedParse.toLocaleString()}`);
console.log(`   Event lasts the full day until 11:59 PM\n`);

console.log("=== WHY ONLY ZENLESS ZONE ZERO? ===");
console.log(
  "Zenless Zone Zero uses the NOTICE API which includes SPECIFIC TIMES.",
);
console.log(
  "When we strip the time and store only the date, we lose precision.",
);
console.log(
  "Other games use the CALENDAR API which already provides date-only values.\n",
);

console.log(
  "💡 REAL SOLUTION: Store the full timestamp with time, not just the date!",
);
