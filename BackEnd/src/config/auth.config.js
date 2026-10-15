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

/** Token lifetime. Without a default, a missing env var would mean tokens never expire. */
function getJwtExpiration() {
  return process.env.JWT_EXPIRATION || "12h";
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
