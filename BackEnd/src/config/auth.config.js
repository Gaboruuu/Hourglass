const dotenv = require("dotenv");

dotenv.config();

const JWT_ALGORITHM = "HS256";
const MIN_SECRET_LENGTH = 32;

/**
 * The JWT secret. Throws when it's missing or too short to be safe,
 * so the server refuses to start instead of signing weak tokens.
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be set and at least ${MIN_SECRET_LENGTH} characters long`,
    );
  }
  return secret;
}

const DEFAULT_EXPIRATION_SECONDS = 12 * 60 * 60;
const MIN_EXPIRATION_SECONDS = 5 * 60;
const MAX_EXPIRATION_SECONDS = 7 * 24 * 60 * 60;
const UNIT_SECONDS = { s: 1, m: 60, h: 60 * 60, d: 24 * 60 * 60 };

/**
 * Token lifetime in seconds, from JWT_EXPIRATION ("12h", "30m", "7d", or plain seconds like "43200").
 * Parsed here because env vars are always strings and jsonwebtoken reads a plain number string
 * as milliseconds ("43200" would mean 43 seconds). Unset means 12h, so tokens always expire.
 * Throws on anything else or outside 5 minutes – 7 days; server.js checks it at startup.
 */
function getJwtExpiration() {
  const raw = (process.env.JWT_EXPIRATION || "").trim();
  if (!raw) return DEFAULT_EXPIRATION_SECONDS;

  const match = raw.match(/^(\d+)\s*([smhd])?$/i);
  const seconds = match ? Number(match[1]) * UNIT_SECONDS[(match[2] || "s").toLowerCase()] : NaN;

  if (!Number.isSafeInteger(seconds) || seconds < MIN_EXPIRATION_SECONDS || seconds > MAX_EXPIRATION_SECONDS) {
    throw new Error(
      `JWT_EXPIRATION="${raw}" is not valid: use a number with s/m/h/d (e.g. "12h") or plain seconds, between 5m and 7d`,
    );
  }
  return seconds;
}

/**
 * AUTH_ENFORCE=false puts authorization in report-only mode (used during rollout):
 * requests that would be rejected are logged and let through. Anything else enforces.
 */
function isAuthEnforced() {
  return process.env.AUTH_ENFORCE !== "false";
}

module.exports = {
  JWT_ALGORITHM,
  getJwtSecret,
  getJwtExpiration,
  isAuthEnforced,
};
