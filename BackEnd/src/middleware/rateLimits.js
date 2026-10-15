const { rateLimit } = require("express-rate-limit");
const { matchSyncKey } = require("../config/apiKeys");

const tooMany = { message: "Too many requests, please try again later" };

/**
 * Created per app instance (not at module load) so each test app gets fresh counters.
 * Limits are per client IP; `trust proxy` in app.js makes that the real IP behind Render.
 */
function createRateLimiters() {
  return {
    // Everything: generous for the app's reads. EventsSync (valid API key) is exempt,
    // since GitHub runners share IPs with other users.
    global: rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 300,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skip: (req) => matchSyncKey(req.get("x-api-key")) !== null,
      message: tooMany,
    }),
    // Login: 5 failed attempts per 15 minutes; successful logins don't count
    login: rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 5,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skipSuccessfulRequests: true,
      message: tooMany,
    }),
  };
}

module.exports = { createRateLimiters };
