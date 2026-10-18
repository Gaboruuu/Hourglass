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
 * Builds the Express app without starting it (server.js listens; tests use it directly).
 */
function createApp() {
  const app = express();
  const limiters = createRateLimiters();

  // Render runs behind one proxy: without this, every client has the proxy's IP and
  // the rate limits would treat all users as one
  app.set("trust proxy", 1);

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

module.exports = { createApp };
