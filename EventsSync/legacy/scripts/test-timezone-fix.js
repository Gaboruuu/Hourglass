/**
 * Test script to demonstrate the timezone issue and fix
 *
 * The problem: When storing dates as "YYYY-MM-DD" without time,
 * JavaScript's Date constructor treats them as UTC midnight.
 * This causes events to expire early in timezones ahead of UTC.
 */

const eventExpiryDate = "2026-02-05";

console.log("=== TIMEZONE ISSUE DEMONSTRATION ===\n");
console.log(`Event expiry_date from database: "${eventExpiryDate}"`);
console.log(`Current time: ${new Date().toLocaleString()}\n`);

// ❌ WRONG WAY - This causes the bug
console.log("❌ WRONG: Using new Date(expiry_date)");
const wrongWay = new Date(eventExpiryDate);
console.log(`  Parsed as: ${wrongWay.toISOString()}`);
console.log(`  In local timezone: ${wrongWay.toLocaleString()}`);
console.log(
  `  This is midnight UTC, which may be yesterday in your timezone!\n`,
);

// ✅ CORRECT WAY - Parse as local date at end of day
console.log("✅ CORRECT: Parse as local date at end of day");
const [year, month, day] = eventExpiryDate.split("-").map(Number);
const correctWay = new Date(year, month - 1, day, 23, 59, 59, 999);
console.log(`  Parsed as: ${correctWay.toISOString()}`);
console.log(`  In local timezone: ${correctWay.toLocaleString()}`);
console.log(
  `  This is 11:59:59 PM on ${eventExpiryDate} in your local timezone!\n`,
);

// Compare with current time
const now = new Date();
console.log("=== COMPARISON ===\n");
console.log(`Current time: ${now.toISOString()}`);
console.log(
  `\nWrong way - Event expired? ${wrongWay.getTime() < now.getTime()}`,
);
console.log(
  `Correct way - Event expired? ${correctWay.getTime() < now.getTime()}`,
);

// Time difference
const wrongDiff = (wrongWay.getTime() - now.getTime()) / (1000 * 60 * 60);
const correctDiff = (correctWay.getTime() - now.getTime()) / (1000 * 60 * 60);

console.log(`\nWrong way - Hours remaining: ${wrongDiff.toFixed(2)}`);
console.log(`Correct way - Hours remaining: ${correctDiff.toFixed(2)}`);

console.log("\n=== EXPLANATION ===");
console.log(
  `The difference is approximately ${Math.abs(correctDiff - wrongDiff).toFixed(2)} hours.`,
);
console.log("This is because:");
console.log("1. The wrong way treats the date as UTC midnight");
console.log("2. Your timezone offset shifts this to an earlier time");
console.log("3. The event appears to expire early by your timezone offset!");
