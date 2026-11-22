const test = require("node:test");
const assert = require("node:assert");
const { createClient, absoluteUrl } = require("../src/scraper/client");
const { discoverPages, discoverVersionLinks } = require("../src/scraper/discover");
const { SourceBlockedError, SourceLayoutError } = require("../src/scraper/errors");
const source = require("../src/scraper/source");
const { fixture } = require("./helpers");

const page = `<html><head><title>Page｜${source.name}</title></head><body>ok</body></html>`;
const response = (status, body = page, headers = {}) => ({ status, text: async () => body, headers: new Map(Object.entries(headers)) });

function fakeFetch(responses) {
  const calls = [];
  const fn = async (url, options) => {
    calls.push({ url, options });
    const next = typeof responses === "function" ? responses(url) : responses.shift();
    if (next instanceof Error) throw next;
    return next;
  };
  fn.calls = calls;
  return fn;
}

test("absoluteUrl drops #fragments and resolves paths against the source", () => {
  assert.strictEqual(absoluteUrl("/games/X/archives/1#hl_2"), `${source.baseUrl}/games/X/archives/1`);
  assert.strictEqual(absoluteUrl("https://other.test/a"), "https://other.test/a");
});

test("each URL is fetched once per run, with the identifying User-Agent", async () => {
  const fetchImpl = fakeFetch(() => response(200));
  const client = createClient({ fetchImpl, delayMs: 0 });
  const [a, b] = await Promise.all([client.get("/games/X"), client.get(`${source.baseUrl}/games/X#top`)]);
  assert.strictEqual(a, page);
  assert.strictEqual(b, page);
  assert.strictEqual(fetchImpl.calls.length, 1);
  assert.strictEqual(client.requests, 1);
  assert.strictEqual(fetchImpl.calls[0].options.headers["User-Agent"], source.userAgent);
});

test("requests run one after another with the delay in between", async () => {
  const times = [];
  const fetchImpl = fakeFetch(() => (times.push(Date.now()), response(200)));
  const client = createClient({ fetchImpl, delayMs: 40 });
  await Promise.all([client.get("/a"), client.get("/b"), client.get("/c")]);
  assert.strictEqual(times.length, 3);
  assert.ok(times[1] - times[0] >= 35 && times[2] - times[1] >= 35, `gaps: ${times[1] - times[0]}, ${times[2] - times[1]}`);
});

test("refusals and challenge pages are SourceBlockedError", async () => {
  const cases = [
    response(403),
    response(429),
    response(202, page, { "x-amzn-waf-action": "challenge" }),
    response(200, "<html><head><title>Just a moment</title></head></html>"),
    response(500),
    new TypeError("fetch failed"),
  ];
  for (const r of cases) {
    const client = createClient({ fetchImpl: fakeFetch([r]), delayMs: 0 });
    await assert.rejects(client.get("/x"), (e) => e instanceof SourceBlockedError && e.context.url.endsWith("/x"));
  }
});

test("a failed request isn't cached", async () => {
  const fetchImpl = fakeFetch([response(429), response(200)]);
  const client = createClient({ fetchImpl, delayMs: 0 });
  await assert.rejects(client.get("/x"));
  assert.strictEqual(await client.get("/x"), page);
});

test("discoverPages: home-page link of this game, else the config url", () => {
  const config = {
    key: "testgame",
    slug: "Test-Game",
    pages: {
      events: { find: /^All Events and Schedule$/i, url: "/games/Test-Game/archives/1" },
      banners: { find: /^Banner Schedule$/i, url: "/games/Test-Game/archives/2" },
    },
  };
  const { pages, warnings } = discoverPages(config, fixture("home.html"));
  assert.deepStrictEqual(pages, {
    home: `${source.baseUrl}/games/Test-Game`,
    events: `${source.baseUrl}/games/Test-Game/archives/301`,
    banners: `${source.baseUrl}/games/Test-Game/archives/2`,
  });
  assert.match(warnings[0], /banners page: no home-page link matches/);

  assert.throws(
    () => discoverPages({ ...config, pages: { codes: { find: /^Codes$/ } } }, fixture("home.html")),
    (e) => e instanceof SourceLayoutError && /codes page not found/.test(e.message),
  );
});

test("discoverVersionLinks: newest first, one per version, other link texts ignored", () => {
  const config = { slug: "Test-Game", version: { find: /^(?:Version (\d+\.\d+)|(\d+\.\d+) Banners, Release Date, and Summary)$/i } };
  assert.deepStrictEqual(discoverVersionLinks(config, fixture("home.html")), [
    { version: "4.10", url: `${source.baseUrl}/games/Test-Game/archives/410` },
    { version: "4.9", url: `${source.baseUrl}/games/Test-Game/archives/409` },
    { version: "4.8", url: `${source.baseUrl}/games/Test-Game/archives/480` },
  ]);
  assert.deepStrictEqual(discoverVersionLinks({ slug: "Test-Game" }, fixture("home.html")), []);
});
