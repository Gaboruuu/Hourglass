const request = require("supertest");
const { SYNC_KEY, setTestEnv } = require("./helpers");

jest.mock("../src/models/user.model", () => ({ BCRYPT_COST: 4, findById: jest.fn(), findByUsername: jest.fn() }));
jest.mock("../src/models/event.model", () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  batchCheckEvents: jest.fn(),
  postEvent: jest.fn(),
  updateEvent: jest.fn(),
}));
jest.mock("../src/models/games.model", () => ({ findById: jest.fn() }));

const Events = require("../src/models/event.model");
const Games = require("../src/models/games.model");
const { createApp } = require("../src/app");

const SYNC = { "x-api-key": SYNC_KEY };
const validEvent = {
  game_id: 1,
  event_name: "Test Event",
  start_date: "2026-10-01",
  expiry_date: "2026-10-20",
  event_type: "main",
};

let app;

beforeEach(() => {
  jest.clearAllMocks();
  setTestEnv();
  app = createApp();
  Games.findById.mockResolvedValue({ game_id: 1 });
  Events.postEvent.mockResolvedValue(10);
  Events.findById.mockResolvedValue({ event_id: 1, start_date: "2026-10-01", expiry_date: "2026-10-20" });
  Events.updateEvent.mockResolvedValue(true);
});

describe("errors never leak internals", () => {
  test("a DB error becomes a generic 500", async () => {
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    Events.findAll.mockRejectedValue(new Error("ER_NO_SUCH_TABLE: Table 'defaultdb.events' doesn't exist"));

    const res = await request(app).get("/api/events");
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ message: "Internal server error" });
    expect(JSON.stringify(res.body)).not.toMatch(/ER_|defaultdb/);
    expect(error).toHaveBeenCalled(); // details go to the server log instead
    error.mockRestore();
  });

  test("unknown routes are a JSON 404", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Not found" });
  });

  test("invalid JSON is a 400", async () => {
    const res = await request(app)
      .post("/api/events")
      .set(SYNC)
      .set("Content-Type", "application/json")
      .send("{not json");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Invalid JSON" });
  });

  test("bodies over 100kb are refused", async () => {
    const res = await request(app)
      .post("/api/events")
      .set(SYNC)
      .send({ ...validEvent, event_name: "x".repeat(110 * 1024) });
    expect(res.status).toBe(413);
  });
});

describe("event validation", () => {
  test.each([
    ["an impossible date", { start_date: "2026-02-30" }],
    ["a non-ISO date", { start_date: "10/01/2026" }],
    ["start after expiry", { start_date: "2026-10-21" }],
    ["an unknown event_type", { event_type: "banner" }],
    ["an http image", { background_url: "http://example.com/a.png" }],
    ["a non-URL image", { background_url: "javascript:alert(1)" }],
    ["an unknown field", { role: "admin" }],
    ["a missing name", { event_name: "   " }],
    ["a string game_id", { game_id: "1; DROP TABLE events" }],
  ])("rejects %s", async (_, change) => {
    const res = await request(app).post("/api/events").set(SYNC).send({ ...validEvent, ...change });
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
    expect(Events.postEvent).not.toHaveBeenCalled();
  });

  test("the app's boolean daily_login is stored as 0/1 and the name is trimmed", async () => {
    const res = await request(app)
      .post("/api/events")
      .set(SYNC)
      .send({ ...validEvent, event_name: "  Padded  ", daily_login: true });
    expect(res.status).toBe(201);
    expect(Events.postEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_name: "Padded", daily_login: 1, background_url: null }),
    );
  });

  test("a partial update can't move the start after the stored expiry", async () => {
    const res = await request(app).put("/api/events/1").set(SYNC).send({ start_date: "2026-11-01" });
    expect(res.status).toBe(400);
    expect(Events.updateEvent).not.toHaveBeenCalled();
  });

  test("an empty update is rejected", async () => {
    const res = await request(app).put("/api/events/1").set(SYNC).send({});
    expect(res.status).toBe(400);
  });

  test("batch-check trims names like create does, so a stored event isn't reported as new", async () => {
    // Stored by POST /events (which trims) as "Padded Name"
    Events.batchCheckEvents.mockResolvedValue([{ event_name: "Padded Name", start_date: "2026-10-01" }]);
    const res = await request(app)
      .post("/api/events/batch-check")
      .set(SYNC)
      .send([{ event_name: "  Padded Name ", start_date: "2026-10-01", game_id: 1 }]);
    expect(res.status).toBe(200);
    expect(res.body.existing).toHaveLength(1);
    expect(res.body.new).toHaveLength(0);
    expect(Events.batchCheckEvents).toHaveBeenCalledWith([
      expect.objectContaining({ event_name: "Padded Name", game_id: 1 }),
    ]);
  });
});

describe("rate limits", () => {
  test("health checks are never rate-limited (Render would restart the instance on 429s)", async () => {
    for (let i = 0; i < 310; i++) {
      const res = await request(app).get("/healthz");
      if (res.status !== 200) throw new Error(`/healthz request ${i + 1} returned ${res.status}`);
    }
  });

  test("API routes are limited to 300 requests per 15 minutes per IP", async () => {
    Events.findAll.mockResolvedValue([]);
    for (let i = 0; i < 300; i++) {
      const res = await request(app).get("/api/events");
      if (res.status !== 200) throw new Error(`request ${i + 1} returned ${res.status}`);
    }
    expect((await request(app).get("/api/events")).status).toBe(429);
  });
});

describe("HTTP hardening", () => {
  test("security headers are set", async () => {
    const res = await request(app).get("/healthz");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["x-powered-by"]).toBeUndefined();
  });

  test("CORS: only origins in CORS_ORIGINS get access", async () => {
    setTestEnv({ CORS_ORIGINS: "https://hourglass.example.com" });
    app = createApp();
    const allowed = await request(app).get("/healthz").set("Origin", "https://hourglass.example.com");
    const other = await request(app).get("/healthz").set("Origin", "https://evil.example.com");
    expect(allowed.headers["access-control-allow-origin"]).toBe("https://hourglass.example.com");
    expect(other.headers["access-control-allow-origin"]).toBeUndefined();
  });

  test("CORS: no browser origin is allowed by default, and x-api-key is never allowed", async () => {
    const res = await request(app)
      .options("/api/events")
      .set("Origin", "https://hourglass.example.com")
      .set("Access-Control-Request-Method", "POST");
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    expect(res.headers["access-control-allow-headers"]).not.toMatch(/x-api-key/i);
  });
});
