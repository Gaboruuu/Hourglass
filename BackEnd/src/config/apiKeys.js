const crypto = require("crypto");
const dotenv = require("dotenv");

dotenv.config();

const sha256 = (value) => crypto.createHash("sha256").update(value).digest();

/**
 * Hashes of the valid sync API keys from SYNC_API_KEYS (comma-separated, so a new key can be
 * added before the old one is removed). Read on every call so tests and rotations see changes.
 * An empty list disables the sync role: it never means "open".
 */
function getSyncKeyHashes() {
  return (process.env.SYNC_API_KEYS || "")
    .split(",")
    .map((key) => key.trim())
    .filter(Boolean)
    .map(sha256);
}

/**
 * Returns a short fingerprint of the matching key (for logs, never the key itself),
 * or null when the key is not valid.
 */
function matchSyncKey(key) {
  if (typeof key !== "string" || key.length === 0) return null;
  const incoming = sha256(key);
  // Hashing makes both buffers 32 bytes, which timingSafeEqual requires
  const match = getSyncKeyHashes().find((hash) => crypto.timingSafeEqual(hash, incoming));
  return match ? match.toString("hex").slice(0, 8) : null;
}

module.exports = { matchSyncKey };
