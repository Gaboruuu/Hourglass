/**
 * Fetches source pages: identifying User-Agent, a pause between requests, block detection, and a
 * per-run cache so a page is only downloaded once even when several sections read it.
 */
const cheerio = require("cheerio");
const source = require("./source");
const { SourceBlockedError } = require("./errors");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Absolute URL for a path or URL from the source ("/archives/1" → "https://…/archives/1"), without #fragment */
function absoluteUrl(href, base = source.baseUrl) {
  return new URL(href, base).toString().split("#")[0];
}

/** Throws SourceBlockedError when the response is a refusal or a challenge page instead of content */
function assertNotBlocked({ status, headers, body, url }) {
  const waf = headers.get ? headers.get("x-amzn-waf-action") : headers["x-amzn-waf-action"];
  if (waf || status === 202 || status === 403 || status === 429) {
    throw new SourceBlockedError(`${source.name} refused the request (HTTP ${status}${waf ? `, WAF action: ${waf}` : ""})`, { url });
  }
  if (status !== 200) throw new SourceBlockedError(`${source.name} returned HTTP ${status}`, { url });
  const title = cheerio.load(body)("title").text();
  if (!source.titleMarker.test(title)) {
    throw new SourceBlockedError(`${source.name} returned a page without its normal title (challenge page?)`, { url });
  }
}

/**
 * createClient() → { get(url) → html, requests }
 * `fetchImpl` and `delayMs` are injectable for tests.
 */
function createClient({ fetchImpl = fetch, delayMs = source.delayMs, timeoutMs = source.timeoutMs } = {}) {
  const cache = new Map();
  let lastRequestAt = 0;
  let requests = 0;

  async function download(url) {
    const wait = lastRequestAt + delayMs - Date.now();
    if (requests > 0 && wait > 0) await sleep(wait);
    requests++;
    let response;
    try {
      response = await fetchImpl(url, {
        headers: { "User-Agent": source.userAgent, Accept: "text/html" },
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      throw new SourceBlockedError(`request failed: ${error.message}`, { url });
    } finally {
      lastRequestAt = Date.now();
    }
    const body = await response.text();
    assertNotBlocked({ status: response.status, headers: response.headers, body, url });
    return body;
  }

  // Requests run one after another, even when get() is called for several pages at once
  let queue = Promise.resolve();
  const schedule = (url) => {
    const pending = queue.then(() => download(url));
    queue = pending.catch(() => {});
    return pending;
  };

  return {
    /** The page's HTML. The same URL is only fetched once per client */
    get(url) {
      const key = absoluteUrl(url);
      if (!cache.has(key)) {
        const pending = schedule(key);
        cache.set(key, pending);
        pending.catch(() => cache.delete(key)); // a failed request may be retried
      }
      return cache.get(key);
    },
    get requests() {
      return requests;
    },
  };
}

module.exports = { createClient, absoluteUrl, assertNotBlocked };
