const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { TEST_SECRET, setTestEnv } = require("./helpers");

jest.mock("../src/models/user.model", () => ({
  BCRYPT_COST: 4,
  findById: jest.fn(),
  findByUsername: jest.fn(),
}));

const User = require("../src/models/user.model");
const { createApp } = require("../src/app");
const { getJwtSecret, getJwtExpiration } = require("../src/config/auth.config");

const PASSWORD = "correct horse battery staple";
let app;

beforeAll(async () => {
  const hash = await bcrypt.hash(PASSWORD, 4);
  User.findByUsername.mockImplementation(async (username) =>
    username === "admin" ? { id: 1, username: "admin", email: "a@b.c", role: "admin", password: hash } : undefined,
  );
});

beforeEach(() => {
  setTestEnv();
  app = createApp(); // fresh rate-limit counters
});

const login = (body) => request(app).post("/api/auth/login").send(body);

test("a valid login returns a 12h HS256 token and no email or password hash", async () => {
  const res = await login({ username: "admin", password: PASSWORD });
  expect(res.status).toBe(200);
  expect(res.body).toEqual({
    id: 1,
    username: "admin",
    role: "admin",
    accessToken: expect.any(String),
    expiresAt: expect.any(Number),
  });

  const payload = jwt.verify(res.body.accessToken, TEST_SECRET, { algorithms: ["HS256"] });
  expect(payload).toEqual({ id: 1, iat: expect.any(Number), exp: expect.any(Number) });
  expect(payload.exp - payload.iat).toBe(12 * 60 * 60);
  expect(res.body.expiresAt).toBe(payload.exp * 1000);
});

test("JWT_EXPIRATION unset still gives tokens that expire (12h default)", async () => {
  delete process.env.JWT_EXPIRATION;
  const res = await login({ username: "admin", password: PASSWORD });
  const payload = jwt.decode(res.body.accessToken);
  expect(payload.exp - payload.iat).toBe(12 * 60 * 60);
});

test("a wrong username and a wrong password get the exact same answer", async () => {
  const wrongUser = await login({ username: "nobody", password: PASSWORD });
  const wrongPassword = await login({ username: "admin", password: "wrong password!" });
  expect(wrongUser.status).toBe(401);
  expect(wrongPassword.status).toBe(401);
  expect(wrongUser.body).toEqual(wrongPassword.body);
  expect(wrongUser.body).toEqual({ message: "Invalid username or password" });
});

test("missing or non-string fields are a 400 without touching the DB", async () => {
  User.findByUsername.mockClear();
  for (const body of [{}, { username: "admin" }, { username: ["admin"], password: PASSWORD }]) {
    const res = await login(body);
    expect(res.status).toBe(400);
  }
  expect(User.findByUsername).not.toHaveBeenCalled();
});

test("the 6th failed login in 15 minutes is rate-limited, successful ones don't count", async () => {
  await login({ username: "admin", password: PASSWORD }); // success: not counted
  for (let i = 0; i < 5; i++) {
    expect((await login({ username: "admin", password: "nope" })).status).toBe(401);
  }
  const blocked = await login({ username: "admin", password: PASSWORD });
  expect(blocked.status).toBe(429);
});

describe("JWT_EXPIRATION", () => {
  test.each([
    [undefined, 43200],
    ["", 43200],
    ["12h", 43200],
    ["30m", 1800],
    ["7d", 604800],
    ["3600s", 3600],
    ["43200", 43200], // plain digits are seconds (jsonwebtoken alone would read them as ms)
    [" 12H ", 43200],
  ])("%p → %p seconds", (value, seconds) => {
    if (value === undefined) delete process.env.JWT_EXPIRATION;
    else process.env.JWT_EXPIRATION = value;
    expect(getJwtExpiration()).toBe(seconds);
  });

  test.each([
    "abc",
    "Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MGFiY2RlZmdoaWo", // a "Generate"-style random value
    "12 hours",
    "1.5h",
    "-1h",
    "0",
    "60s", // under 5 minutes
    "8d", // over 7 days
  ])("refuses %p", (value) => {
    process.env.JWT_EXPIRATION = value;
    expect(() => getJwtExpiration()).toThrow(/JWT_EXPIRATION/);
  });

  test("a plain-seconds value gives tokens of that length", async () => {
    process.env.JWT_EXPIRATION = "3600";
    const res = await login({ username: "admin", password: PASSWORD });
    const payload = jwt.decode(res.body.accessToken);
    expect(payload.exp - payload.iat).toBe(3600);
  });
});

describe("JWT_SECRET", () => {
  test.each([undefined, "", "too-short"])("refuses %p", (secret) => {
    if (secret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = secret;
    expect(() => getJwtSecret()).toThrow(/JWT_SECRET/);
  });
});
