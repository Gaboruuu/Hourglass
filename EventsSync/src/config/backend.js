const dotenv = require("dotenv");

dotenv.config({ quiet: true });

// One environment (production). Override with BACKEND_URL, e.g. http://localhost:8080/api
const BACKEND_URL = process.env.BACKEND_URL || "https://hourglass-h6zo.onrender.com/api";

/**
 * The sync API key (GitHub secret SYNC_API_KEY in CI, EventsSync/.env locally).
 * Throws when it's missing, so the sync stops before fetching anything.
 */
function getSyncApiKey() {
  const key = process.env.SYNC_API_KEY;
  if (!key) {
    throw new Error(
      "SYNC_API_KEY is not set. Add it to EventsSync/.env (local) or the GitHub secret SYNC_API_KEY (CI).",
    );
  }
  return key;
}

/** Headers for every write to the backend */
const backendHeaders = () => ({
  "Content-Type": "application/json",
  "x-api-key": getSyncApiKey(),
});

module.exports = { BACKEND_URL, getSyncApiKey, backendHeaders };
