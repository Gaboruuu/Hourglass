/**
 * The two backend calls the sync makes, with the sync API key:
 *   POST /events/batch-check   which events already exist (sent in chunks: the backend caps a request
 *                              at 1000 items and 100kb of JSON)
 *   POST /events               create one event
 * A 401/403 becomes a BackendAuthError, so the report can say "check the API key".
 */
const { BACKEND_URL, backendHeaders } = require("../config/backend");

/** Events per batch-check request. ~250 bytes each → ~50kb, well under the backend's 100kb limit */
const BATCH_SIZE = 200;

class BackendAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = "BackendAuthError";
  }
}

async function post(path, body, { fetchImpl = fetch, baseUrl = BACKEND_URL } = {}) {
  const response = await fetchImpl(`${baseUrl}${path}`, {
    method: "POST",
    headers: backendHeaders(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000), // Render cold starts take tens of seconds
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message = `${path}: HTTP ${response.status}${data.message ? ` ${data.message}` : ""}`;
    if (response.status === 401 || response.status === 403) throw new BackendAuthError(message);
    const error = new Error(message);
    error.status = response.status;
    error.details = data.errors;
    throw error;
  }
  return response.json();
}

/** → { existing: [...], new: [...] } for the whole list, however many chunks it takes */
async function batchCheck(events, options = {}) {
  const result = { existing: [], new: [] };
  for (let i = 0; i < events.length; i += BATCH_SIZE) {
    const chunk = await post("/events/batch-check", events.slice(i, i + BATCH_SIZE), options);
    if (!Array.isArray(chunk?.existing) || !Array.isArray(chunk?.new)) {
      throw new Error("/events/batch-check: unexpected response (is the backend up?)");
    }
    result.existing.push(...chunk.existing);
    result.new.push(...chunk.new);
  }
  return result;
}

const createEvent = (event, options = {}) => post("/events", event, options);

module.exports = { batchCheck, createEvent, BackendAuthError, BATCH_SIZE };
