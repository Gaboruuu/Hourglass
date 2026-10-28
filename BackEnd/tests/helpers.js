// Shared test setup. Test files call jest.mock(...) for the models themselves (jest hoists it per file).
const jwt = require("jsonwebtoken");

const TEST_SECRET = "test-secret-that-is-at-least-32-characters-long";
const SYNC_KEY = "test-sync-key";

function setTestEnv(overrides = {}) {
  Object.assign(process.env, {
    JWT_SECRET: TEST_SECRET,
    JWT_EXPIRATION: "12h",
    SYNC_API_KEYS: SYNC_KEY,
    AUTH_ENFORCE: "true",
    CORS_ORIGINS: "",
    ...overrides,
  });
}

const signToken = (id, options = {}) =>
  jwt.sign({ id }, options.secret || TEST_SECRET, {
    algorithm: "HS256",
    expiresIn: options.expiresIn || "1h",
  });

/** A token with "alg: none" (no signature), which must never be accepted */
function unsignedToken(id) {
  const encode = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  return `${encode({ alg: "none", typ: "JWT" })}.${encode({ id, iat: now, exp: now + 3600 })}.`;
}

// User ids used across tests: 1 = admin, 2 = normal user
const USERS = {
  1: { id: 1, username: "admin", role: "admin" },
  2: { id: 2, username: "reader", role: "user" },
};

module.exports = { TEST_SECRET, SYNC_KEY, USERS, setTestEnv, signToken, unsignedToken };
