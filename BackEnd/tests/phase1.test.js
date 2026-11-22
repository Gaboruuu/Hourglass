// Phase 1 backend prep: "banner" event type, batch-check dedup key with game_id, DATE columns as strings.
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
let app;

beforeEach(() => {
  jest.clearAllMocks();
  setTestEnv();
  app = createApp();
  Games.findById.mockResolvedValue({ game_id: 5, game_name: "Wuthering Waves" });
  Events.postEvent.mockResolvedValue(1);
});

test("a banner can be created", async () => {
  const res = await request(app).post("/api/events").set(SYNC).send({
    game_id: 5,
    event_name: "Lily Banner",
    start_date: "2026-11-12",
    expiry_date: "2026-12-03",
    event_type: "banner",
  });
  expect(res.status).toBe(201);
  expect(Events.postEvent).toHaveBeenCalledWith(expect.objectContaining({ event_type: "banner" }));
});

describe("batch-check dedup key: game_id + event_name + start_date", () => {
  test("game_id is required", async () => {
    const res = await request(app).post("/api/events/batch-check").set(SYNC).send([{ event_name: "A", start_date: "2026-10-01" }]);
    expect(res.status).toBe(400);
    expect(Events.batchCheckEvents).not.toHaveBeenCalled();
  });

  test("the same name and start date in another game is a new event", async () => {
    Events.batchCheckEvents.mockResolvedValue([{ game_id: 4, event_name: "Shared Name", start_date: "2026-11-11" }]);
    const res = await request(app)
      .post("/api/events/batch-check")
      .set(SYNC)
      .send([
        { game_id: 4, event_name: "Shared Name", start_date: "2026-11-11", expiry_date: "2026-11-20" },
        { game_id: 3, event_name: "Shared Name", start_date: "2026-11-11", expiry_date: "2026-11-20" },
      ]);
    expect(res.status).toBe(200);
    expect(res.body.existing.map((e) => e.game_id)).toEqual([4]);
    expect(res.body.new.map((e) => e.game_id)).toEqual([3]);
    // The whole event is passed through (the sync posts the "new" list as-is)
    expect(res.body.new[0].expiry_date).toBe("2026-11-20");
  });
});

describe("event model", () => {
  const query = jest.fn();
  let Model;

  beforeAll(() => {
    jest.isolateModules(() => {
      jest.doMock("../src/config/db.config", () => ({ pool: { query } }));
      Model = jest.requireActual("../src/models/event.model");
    });
  });
  beforeEach(() => query.mockReset());

  test("batch-check queries by game, name and start", async () => {
    query.mockResolvedValue([[{ game_id: 4, event_name: "A", start_date: "2026-11-11" }]]);
    const rows = await Model.batchCheckEvents([
      { game_id: 4, event_name: "A", start_date: "2026-11-11" },
      { game_id: 3, event_name: "B", start_date: "2026-11-12" },
    ]);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toBe(
      "SELECT game_id, event_name, start_date FROM events WHERE (game_id = ? AND event_name = ? AND start_date = ?) OR (game_id = ? AND event_name = ? AND start_date = ?)",
    );
    expect(params).toEqual([4, "A", "2026-11-11", 3, "B", "2026-11-12"]);
    expect(rows).toEqual([{ game_id: 4, event_name: "A", start_date: "2026-11-11", expiry_date: undefined }]);
  });

  test("dates come back as YYYY-MM-DD whatever the server timezone (strings from the pool, Dates read in UTC)", async () => {
    query.mockResolvedValue([
      [
        { event_id: 1, start_date: "2026-11-11", expiry_date: "2026-12-23" },
        { event_id: 2, start_date: new Date("2026-11-11T00:00:00Z"), expiry_date: null },
      ],
    ]);
    const rows = await Model.findAll();
    expect(rows).toEqual([
      { event_id: 1, start_date: "2026-11-11", expiry_date: "2026-12-23" },
      { event_id: 2, start_date: "2026-11-11", expiry_date: null },
    ]);
  });
});

test("the pool returns DATE columns as strings", () => {
  jest.isolateModules(() => {
    const createPool = jest.fn(() => ({ promise: () => ({ query: jest.fn() }) }));
    jest.doMock("mysql2", () => ({ createPool }));
    jest.requireActual("../src/config/db.config"); // the file mocks db.config above for the model tests
    expect(createPool).toHaveBeenCalledWith(expect.objectContaining({ dateStrings: ["DATE"] }));
  });
});
