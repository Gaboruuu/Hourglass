const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const { getJwtSecret, isAuthEnforced } = require("./config/auth.config");

// Refuse to start with a missing or weak JWT secret (throws with a clear message)
getJwtSecret();

// Throws if DB_SSL=REQUIRED and the CA certificate can't be read
const db = require("./config/db.config");
const { createApp } = require("./app");

const app = createApp();

// Set port and start server
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}.`);
  if (!isAuthEnforced()) {
    console.warn("AUTH_ENFORCE=false: authorization is in report-only mode (rejections are only logged)");
  }
  if (!process.env.SYNC_API_KEYS) {
    console.warn("SYNC_API_KEYS is empty: EventsSync can't write until a key is set");
  }

  // Test database connection
  const connected = await db.testConnection();
  if (connected) console.log("Database connection verified.");
});
