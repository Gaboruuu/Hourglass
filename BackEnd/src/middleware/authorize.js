const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const { matchSyncKey } = require("../config/apiKeys");
const { JWT_ALGORITHM, getJwtSecret, isAuthEnforced } = require("../config/auth.config");

/**
 * Works out who is calling:
 *   x-api-key             → "sync" (EventsSync), or a 401 if the key is wrong
 *   Authorization: Bearer → "admin" / "user" from the DB, or a 401 if the token is invalid
 *   neither               → "public"
 * The role is always read from the DB, so demoting an admin takes effect immediately.
 */
async function resolveCaller(req) {
  const apiKey = req.get("x-api-key");
  if (apiKey !== undefined) {
    const keyId = matchSyncKey(apiKey);
    return keyId ? { role: "sync", keyId } : { error: "Invalid API key" };
  }

  const header = req.get("authorization") || "";
  if (header) {
    const [scheme, token] = header.split(" ");
    if (scheme !== "Bearer" || !token) return { error: "Invalid authorization header" };

    let payload;
    try {
      // Pinning the algorithm blocks "alg: none" and algorithm-switching tokens
      payload = jwt.verify(token, getJwtSecret(), { algorithms: [JWT_ALGORITHM] });
    } catch {
      return { error: "Invalid or expired token" };
    }

    const user = await User.findById(payload.id);
    if (!user) return { error: "Invalid or expired token" };
    return { role: user.role === "admin" ? "admin" : "user", userId: user.id };
  }

  return { role: "public" };
}

/**
 * Route guard: `authorize("sync", "admin")` lets only those roles through.
 * 401 = missing or invalid credentials, 403 = valid credentials but not allowed.
 *
 * Rollout mode (AUTH_ENFORCE=false) only relaxes routes that opt in with a trailing
 * `{ reportOnly: true }`: those used by clients that don't send credentials yet (EventsSync,
 * older app builds). There it logs what it would reject and lets the request through.
 * Every other route (e.g. DELETE) is always enforced, so the rollout never opens new access.
 */
function authorize(...args) {
  const options = typeof args[args.length - 1] === "object" ? args.pop() : {};
  const allowedRoles = args;
  const reportOnlyAllowed = options.reportOnly === true;

  return async (req, res, next) => {
    try {
      const caller = await resolveCaller(req);
      req.auth = caller.error ? { role: "public" } : caller;

      let status = null;
      if (caller.error) status = 401;
      else if (!allowedRoles.includes(caller.role)) status = caller.role === "public" ? 401 : 403;

      if (status && (isAuthEnforced() || !reportOnlyAllowed)) {
        const message = caller.error || (status === 401 ? "Authentication required" : "Forbidden");
        return res.status(status).json({ message });
      }
      if (status) {
        console.warn(`[auth] would reject ${req.method} ${req.originalUrl} (${status}, role=${caller.role || "invalid"})`);
      } else if (caller.role === "sync" && req.method !== "GET") {
        console.log(`[auth] sync key=#${caller.keyId} ${req.method} ${req.originalUrl}`);
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = { authorize, resolveCaller };
