const request = require("supertest");
const { SYNC_KEY, USERS, setTestEnv, signToken, unsignedToken } = require("./helpers");

jest.mock("../src/models/user.model", () => ({
  BCRYPT_COST: 4,
  findById: jest.fn(),
  findByUsername: jest.fn(),
}));
jest.mock("../src/models/event.model", () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findAllByGameId: jest.fn(),
  batchCheckEvents: jest.fn(),
  postEvent: jest.fn(),
  updateEvent: jest.fn(),
  deleteEvent: jest.fn(),
}));
jest.mock("../src/models/games.model", () => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  create: jest.fn(),
}));

const User = require("../src/models/user.model");
const Events = require("../src/models/event.model");
const Games = require("../src/models/games.model");
const { createApp } = require("../src/app");

const validEvent = {
  game_id: 1,
  event_name: "Test Event",
  start_date: "2026-10-01",
  expiry_date: "2026-10-20",
  event_type: "side",
  daily_login: 0,
  background_url: "https://img.game8.co/1/a.png/show",
};

// Each credential as request headers
const CREDENTIALS = {
  none: {},
  wrongKey: { "x-api-key": "not-the-key" },
  syncKey: { "x-api-key": SYNC_KEY },
  expiredToken: { Authorization: `Bearer ${signToken(1, { expiresIn: "-1s" })}` },
  userToken: { Authorization: `Bearer ${signToken(2)}` },
  adminToken: { Authorization: `Bearer ${signToken(1)}` },
};

// Expected status per credential. Writes: sync + admin; delete/games: admin only; reads: public.
const MATRIX = [
  ["get", "/api/events", null,
    { none: 200, wrongKey: 200, syncKey: 200, expiredToken: 200, userToken: 200, adminToken: 200 }],
  ["get", "/api/games", null,
    { none: 200, wrongKey: 200, syncKey: 200, expiredToken: 200, userToken: 200, adminToken: 200 }],
  ["post", "/api/events/batch-check", [{ event_name: "A", start_date: "2026-10-01" }],
    { none: 401, wrongKey: 401, syncKey: 200, expiredToken: 401, userToken: 403, adminToken: 200 }],
  ["post", "/api/events", validEvent,
    { none: 401, wrongKey: 401, syncKey: 201, expiredToken: 401, userToken: 403, adminToken: 201 }],
  ["put", "/api/events/1", { event_name: "Renamed" },
    { none: 401, wrongKey: 401, syncKey: 200, expiredToken: 401, userToken: 403, adminToken: 200 }],
  ["delete", "/api/events/1", null,
    { none: 401, wrongKey: 401, syncKey: 403, expiredToken: 401, userToken: 403, adminToken: 200 }],
  ["post", "/api/games", { game_name: "Arknights: Endfield" },
    { none: 401, wrongKey: 401, syncKey: 403, expiredToken: 401, userToken: 403, adminToken: 201 }],
  ["get", "/api/auth/me", null,
    { none: 401, wrongKey: 401, syncKey: 403, expiredToken: 401, userToken: 403, adminToken: 200 }],
];

let app;

beforeEach(() => {
  jest.clearAllMocks();
  setTestEnv();
  app = createApp();

  User.findById.mockImplementation(async (id) => USERS[id]);
  Events.findAll.mockResolvedValue([]);
  Events.findById.mockResolvedValue({ event_id: 1, start_date: "2026-10-01", expiry_date: "2026-10-20" });
  Events.batchCheckEvents.mockResolvedValue([]);
  Events.postEvent.mockResolvedValue(10);
  Events.updateEvent.mockResolvedValue(true);
  Events.deleteEvent.mockResolvedValue(true);
  Games.findAll.mockResolvedValue([]);
  Games.findById.mockResolvedValue({ game_id: 1, game_name: "Honkai Impact 3rd" });
  Games.findByName.mockResolvedValue(undefined);
  Games.create.mockResolvedValue(7);
});

const send = (method, path, body, headers) => {
  let req = request(app)[method](path).set(headers);
  if (body) req = req.send(body);
  return req;
};

describe("permission matrix", () => {
  for (const [method, path, body, expected] of MATRIX) {
    for (const [credential, status] of Object.entries(expected)) {
      test(`${method.toUpperCase()} ${path} with ${credential} → ${status}`, async () => {
        const res = await send(method, path, body, CREDENTIALS[credential]);
        expect(res.status).toBe(status);
      });
    }
  }
});

describe("sync API key", () => {
  test("an empty SYNC_API_KEYS disables the sync role (never 'open')", async () => {
    process.env.SYNC_API_KEYS = "";
    const res = await send("post", "/api/events", validEvent, { "x-api-key": SYNC_KEY });
    expect(res.status).toBe(401);
    expect(Events.postEvent).not.toHaveBeenCalled();
  });

  test("both keys work while rotating", async () => {
    process.env.SYNC_API_KEYS = "old-key, new-key";
    for (const key of ["old-key", "new-key"]) {
      const res = await send("post", "/api/events", validEvent, { "x-api-key": key });
      expect(res.status).toBe(201);
    }
  });

  test("a wrong key is rejected even when a valid admin token is also sent", async () => {
    const res = await send("post", "/api/events", validEvent, {
      ...CREDENTIALS.adminToken,
      "x-api-key": "not-the-key",
    });
    expect(res.status).toBe(401);
  });
});

describe("JWT", () => {
  test("an unsigned token (alg: none) is rejected", async () => {
    const res = await send("delete", "/api/events/1", null, { Authorization: `Bearer ${unsignedToken(1)}` });
    expect(res.status).toBe(401);
    expect(Events.deleteEvent).not.toHaveBeenCalled();
  });

  test("a token signed with another secret is rejected", async () => {
    const token = signToken(1, { secret: "a-completely-different-secret-of-32-chars" });
    const res = await send("delete", "/api/events/1", null, { Authorization: `Bearer ${token}` });
    expect(res.status).toBe(401);
  });

  test("the role comes from the DB, not the token: a demoted admin loses access", async () => {
    User.findById.mockResolvedValue({ id: 1, username: "admin", role: "user" });
    const res = await send("delete", "/api/events/1", null, CREDENTIALS.adminToken);
    expect(res.status).toBe(403);
  });

  test("a token for a deleted user is rejected", async () => {
    User.findById.mockResolvedValue(undefined);
    const res = await send("get", "/api/auth/me", null, CREDENTIALS.adminToken);
    expect(res.status).toBe(401);
  });

  test("a malformed Authorization header is rejected", async () => {
    const res = await send("delete", "/api/events/1", null, { Authorization: "Basic abc" });
    expect(res.status).toBe(401);
  });
});

describe("report-only mode (AUTH_ENFORCE=false)", () => {
  test("lets the request through and logs what it would have rejected", async () => {
    process.env.AUTH_ENFORCE = "false";
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const res = await send("post", "/api/events", validEvent, {});
    expect(res.status).toBe(201);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("would reject POST /api/events"));
    warn.mockRestore();
  });

  test.each([
    ["post", "/api/events/batch-check", [{ event_name: "A", start_date: "2026-10-01" }], 200],
    ["put", "/api/events/1", { event_name: "Renamed" }, 200],
  ])("relaxes %s %s (used by clients without credentials yet)", async (method, path, body, status) => {
    process.env.AUTH_ENFORCE = "false";
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const res = await send(method, path, body, {});
    expect(res.status).toBe(status);
    warn.mockRestore();
  });

  test.each([
    ["delete", "/api/events/1", null],
    ["post", "/api/games", { game_name: "Arknights: Endfield" }],
    ["get", "/api/auth/me", null],
  ])("still enforces admin-only %s %s", async (method, path, body) => {
    process.env.AUTH_ENFORCE = "false";
    const res = await send(method, path, body, {});
    expect(res.status).toBe(401);
    expect(Events.deleteEvent).not.toHaveBeenCalled();
    expect(Games.create).not.toHaveBeenCalled();
  });

  test("still enforces admin-only routes for a sync key (403)", async () => {
    process.env.AUTH_ENFORCE = "false";
    const res = await send("delete", "/api/events/1", null, CREDENTIALS.syncKey);
    expect(res.status).toBe(403);
    expect(Events.deleteEvent).not.toHaveBeenCalled();
  });
});

describe("removed routes", () => {
  test.each([
    ["post", "/api/auth/register"],
    ["post", "/api/events/exists"],
  ])("%s %s → 404", async (method, path) => {
    const res = await send(method, path, { username: "x", password: "y", role: "admin" }, {});
    expect(res.status).toBe(404);
  });
});
