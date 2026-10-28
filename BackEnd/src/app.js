const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const dotenv = require("dotenv");

const createAuthRouter = require("./routes/auth.routes");
const eventRoutes = require("./routes/event.routes");
const gamesRoutes = require("./routes/games.routes");
const { createRateLimiters } = require("./middleware/rateLimits");
const { notFoundHandler, errorHandler } = require("./middleware/errorHandler");

dotenv.config();

/** Browser origins allowed to call the API (the planned web version). Empty = none. */
function getAllowedOrigins() {
  return (process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * How many proxies sit in front of the app. On Render a request passes Cloudflare, a Render edge
 * proxy and Render's load balancer (3 hops), each adding an X-Forwarded-For entry; with 3, req.ip
 * is the address Cloudflare saw, i.e. the real client. Measured in production: with 1 or 2 the
 * "client" was a proxy from a small pool, so users shared rate-limit buckets; with 3 each client
 * has its own bucket. Entries a client adds itself sit further left and are ignored, so the limits
 * can't be dodged with a fake header. Throws on an invalid value, so a typo stops the server at startup.
 */
function getTrustProxyHops() {
  const raw = (process.env.TRUST_PROXY_HOPS || "").trim();
  if (!raw) return 3;
  if (!/^\d+$/.test(raw) || Number(raw) > 5) {
    throw new Error(`TRUST_PROXY_HOPS="${raw}" is not valid: use a whole number from 0 to 5 (Render behind Cloudflare = 3)`);
  }
  return Number(raw);
}

/**
 * Builds the Express app without starting it (server.js listens; tests use it directly).
 */
function createApp() {
  const app = express();
  const limiters = createRateLimiters();

  app.set("trust proxy", getTrustProxyHops());

  app.use(helmet());
  // CORS only controls which websites' JavaScript can read responses. The native app is not
  // affected, and it's not what protects the data: authorize() does that.
  app.use(
    cors({
      origin: getAllowedOrigins(),
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(express.json({ limit: "100kb" }));

  // Before the rate limit: Render's health checks run every few seconds from the same IP,
  // and a 429 would count as a failed check (Render stops routing, then restarts the instance)
  app.get("/", (req, res) => {
    res.json({ message: "Welcome to Hourglass API" });
  });
  app.get("/healthz", (req, res) => {
    res.status(200).json({ ok: true, time: new Date().toISOString() });
  });

  app.use(limiters.global);

  app.use("/api/auth", createAuthRouter(limiters));
  app.use("/api/events", eventRoutes);
  app.use("/api/games", gamesRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp, getTrustProxyHops };
