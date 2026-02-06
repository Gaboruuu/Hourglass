const { request } = require("undici");
const { versionDates } = require("../config/versionDates");
const { fixEventDates, getEventType } = require("../services/eventService");
const fs = require("fs");
const path = require("path");

/**
 * Load ignored events from configuration file
 */
function loadIgnoredEvents() {
  const ignoredEventsPath = path.join(__dirname, "../../ignored-events.json");
  try {
    if (fs.existsSync(ignoredEventsPath)) {
      const fileContent = fs.readFileSync(ignoredEventsPath, "utf8");
      const data = JSON.parse(fileContent);
      return data.ignoredEvents || [];
    }
  } catch (error) {
    console.warn(`Could not load ignored-events.json: ${error.message}`);
  }
  return [];
}

/**
 * Check if an event should be ignored based on configuration
 */
function shouldIgnoreEvent(eventName, gameId, ignoredEvents) {
  return ignoredEvents.some((ignored) => {
    const gameIdMatch =
      ignored.gameId === gameId || ignored.gameId === String(gameId);
    const nameMatch = eventName
      .toLowerCase()
      .includes(ignored.eventName.toLowerCase());
    return gameIdMatch && nameMatch;
  });
}

const BASE_API_URL = "https://api.ennead.cc/mihoyo";

/**
 * Fetch JSON data from a URL
 */
async function fetchJson(url) {
  try {
    const { body, statusCode } = await request(url, {
      method: "GET",
      headers: {
        "User-Agent": "Hourglass-EventsSync/1.0",
        Accept: "application/json",
      },
    });

    if (statusCode < 200 || statusCode >= 300) {
      throw new Error(`API request failed with status ${statusCode}`);
    }

    const text = await body.text();
    if (!text || text.trim() === "") {
      console.warn(`Empty response from ${url}`);
      return null;
    }
    return JSON.parse(text);
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error.message);
    throw error;
  }
}

/**
 * Parse date range from event description
 * @param {string} description - Event description text
 * @returns {Object} Object with startDate and expiryDate (timestamps or text)
 */
function parseDateRange(description) {
  // First, try to find "Event Page Duration:" pattern (used in some notices)
  let durationMatch = description.match(
    /Event\s+Page\s+Duration:\s*(.+?)(?=\s*•|\s*Requirements|\s*$)/i,
  );

  // If not found, try the standard "Event Duration" pattern
  if (!durationMatch) {
    durationMatch = description.match(
      /(?:Event Duration\s+)?(.+?)(?=\s*Requirements|\s*Event Details|$)/i,
    );
  }

  if (!durationMatch) {
    return { startDate: null, expiryDate: null };
  }

  const durationText = durationMatch[1];

  // Split by dash/endash to get start and end parts
  const parts = durationText.split(/\s*[–—-]\s*/);
  if (parts.length < 2) {
    return { startDate: null, expiryDate: null };
  }

  const startPart = parts[0].trim();
  const endPart = parts[1].trim();

  let startDate = null;
  let expiryDate = null;

  // Parse start date
  // Check if it's "After Version X.X" text
  const afterVersionRegex =
    /After\s+(?:the\s+)?Version\s+[\d.]+(?:\s+(?:goes\s+live|update))?/i;
  if (afterVersionRegex.test(startPart)) {
    startDate = startPart.match(afterVersionRegex)[0];
  } else {
    // Try to parse as actual date: "2025/02/12 10:00:00" or "2026/01/30 20:30"
    const dateRegex = /(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}(?::\d{2})?)/;
    const dateMatch = startPart.match(dateRegex);
    if (dateMatch) {
      const dateStr = dateMatch[1].replace(/\//g, "-").replace(" ", "T");
      // Add seconds if not present
      const fullDateStr =
        dateStr.includes(":") && dateStr.split(":").length === 2
          ? dateStr + ":00"
          : dateStr;
      startDate = Math.floor(new Date(fullDateStr).getTime() / 1000);
    }
  }

  // Parse end date
  // Check if it's "End of Version X.X" text
  const endOfVersionRegex = /End\s+of\s+Version\s+[\d.]+/i;
  if (endOfVersionRegex.test(endPart)) {
    expiryDate = endPart.match(endOfVersionRegex)[0];
  } else {
    // Try to parse as actual date
    const dateRegex = /(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}(?::\d{2})?)/;
    const dateMatch = endPart.match(dateRegex);
    if (dateMatch) {
      const dateStr = dateMatch[1].replace(/\//g, "-").replace(" ", "T");
      // Add seconds if not present
      const fullDateStr =
        dateStr.includes(":") && dateStr.split(":").length === 2
          ? dateStr + ":00"
          : dateStr;
      expiryDate = Math.floor(new Date(fullDateStr).getTime() / 1000);
    }
  }

  return { startDate, expiryDate };
}

/**
 * Transform API event data to internal event format
 * @param {Object} apiEvent - Raw event data from API
 * @param {string} gameId - Game identifier (e.g., 'genshin', 'starrail', 'zzz')
 * @returns {Object} Transformed event object
 */
function transformEvent(apiEvent, gameId) {
  if (!apiEvent.title.toLowerCase().includes("event details")) {
    return null;
  }

  const { startDate, expiryDate } = parseDateRange(apiEvent.description);
  const isDailyLogin = /each day/i.test(apiEvent.description);

  return {
    title: apiEvent.title
      .replace(/\s*-?\s*Event Details/i, "")
      .replace(/^[""]|[""]$/g, "")
      .trim(),
    game_id: gameId,
    start_date:
      typeof startDate === "number"
        ? new Date(startDate * 1000).toISOString().split("T")[0]
        : startDate, // Keep text like "After Version 1.5"
    expiry_date:
      typeof expiryDate === "number"
        ? new Date(expiryDate * 1000).toISOString().split("T")[0]
        : expiryDate, // Keep text like "End of Version 2.6"
    daily_login: isDailyLogin,
    background_url:
      apiEvent.banner && apiEvent.banner.length > 0 ? apiEvent.banner[0] : null,
  };
}

/**
 * Fetch events from Hoyoverse API calendar endpoint
 * @param {string} game - 'genshin', 'starrail', or 'zzz'
 * @returns {Promise<Array>} Array of transformed event items
 */
async function fetchHoyoverseEventsNotice(game) {
  const url = `${BASE_API_URL}/${game.tag}/news/notices?lang={language}`;
  console.log(`Fetching news from: ${url}`);

  const data = await fetchJson(url);
  console.log(`\nReceived ${data ? data.length : 0} items from API`);

  const events = (data || [])
    .map((item) => transformEvent(item, game.id))
    .filter((event) => event !== null);

  console.log(`\n✓ Found ${events.length} matching events`);

  // Load ignored events configuration
  const ignoredEvents = loadIgnoredEvents();

  // Process events: fix dates and format for database
  const validEvents = [];
  const invalidEvents = [];
  let ignoredCount = 0;

  events.forEach((event) => {
    // Check if event should be ignored
    if (shouldIgnoreEvent(event.title, game.id, ignoredEvents)) {
      ignoredCount++;
      return;
    }

    // Determine event type before fixing dates (to detect "After Version" text)
    let eventType = getEventType(event.start_date, event.expiry_date);

    // Apply date fixes
    const isValid = fixEventDates(event, game.id, versionDates);

    // Check duration after fixing dates - if more than 30 days, it's a main event
    if (event.start_date && event.expiry_date) {
      const start = new Date(event.start_date);
      const expiry = new Date(event.expiry_date);
      const durationInDays = (expiry - start) / (1000 * 60 * 60 * 24);

      if (durationInDays > 30) {
        eventType = "main";
      }
    }

    // Format for database
    const formattedEvent = {
      game_id: parseInt(game.id),
      event_name: event.title,
      start_date: event.start_date,
      expiry_date: event.expiry_date,
      daily_login: event.daily_login ? 1 : 0,
      event_type: eventType,
      background_url: event.background_url,
    };

    // Check if dates are valid after fixing
    const hasValidStartDate =
      formattedEvent.start_date &&
      !isNaN(Date.parse(formattedEvent.start_date));
    const hasValidExpiryDate =
      formattedEvent.expiry_date &&
      !isNaN(Date.parse(formattedEvent.expiry_date));

    if (hasValidStartDate && hasValidExpiryDate) {
      validEvents.push(formattedEvent);
    } else {
      invalidEvents.push(formattedEvent);
    }
  });

  // Save invalid events to file if any
  if (invalidEvents.length > 0) {
    const invalidEventsPath = path.join(__dirname, "../../invalid-events.json");
    const timestamp = new Date().toISOString();

    let existingData = [];
    if (fs.existsSync(invalidEventsPath)) {
      try {
        const fileContent = fs.readFileSync(invalidEventsPath, "utf8");
        if (fileContent.trim()) {
          existingData = JSON.parse(fileContent);
        }
      } catch (error) {
        console.warn(
          `Could not parse existing invalid-events.json: ${error.message}`,
        );
        existingData = [];
      }
    }

    const newData = {
      timestamp,
      gameId: game.id,
      gameTag: game.tag,
      events: invalidEvents,
    };

    existingData.push(newData);
    fs.writeFileSync(
      invalidEventsPath,
      JSON.stringify(existingData, null, 2),
      "utf8",
    );

    console.log(
      `\n⚠ ${invalidEvents.length} events with invalid dates saved to invalid-events.json`,
    );
  }

  if (ignoredCount > 0) {
    console.log(`\n⊘ ${ignoredCount} events ignored based on configuration`);
  }
  console.log(
    `\n✓ ${validEvents.length} valid events ready for database import`,
  );
  return validEvents;
}

async function fetchHoyoverseEventsCalendar(game) {
  const url = `${BASE_API_URL}/${game.tag}/calendar`;
  console.log(`Fetching calendar from: ${url}`);

  const data = await fetchJson(url);

  if (!data) {
    console.log(`\nNo calendar data received from API`);
    return [];
  }

  console.log(`\nReceived calendar data from API`);

  // Extract only events (not banners or challenges)
  const events = data.events || [];
  console.log(`\n✓ Found ${events.length} calendar events`);

  // Load ignored events configuration
  const ignoredEvents = loadIgnoredEvents();

  // Process events: transform and format for database
  const validEvents = [];
  const invalidEvents = [];
  let ignoredCount = 0;

  events.forEach((event) => {
    // Check if event should be ignored
    if (shouldIgnoreEvent(event.name, game.id, ignoredEvents)) {
      ignoredCount++;
      return;
    }

    // Debug: Log raw event data for events without timestamps
    if (!event.start_time || !event.end_time) {
      console.log(
        `\n⚠ Event without timestamps:`,
        JSON.stringify(event, null, 2),
      );
      return;
    }

    // Validate timestamps are reasonable (between year 2000 and 2100)
    // Some timestamps are in seconds, some in milliseconds - need to detect and convert
    const minTimestampSeconds = 946684800; // 2000-01-01 in seconds
    const maxTimestampSeconds = 4102444800; // 2100-01-01 in seconds
    const minTimestampMilliseconds = 946684800000; // 2000-01-01 in milliseconds

    // Helper function to normalize timestamp (handle both seconds and milliseconds)
    const normalizeTimestamp = (timestamp) => {
      if (!timestamp) return null;

      // If timestamp is too large, it's in milliseconds - divide by 1000
      if (timestamp > minTimestampMilliseconds) {
        return timestamp / 1000;
      }
      return timestamp;
    };

    // Convert and normalize timestamps to date strings
    const normalizedStartTime = normalizeTimestamp(event.start_time);
    const normalizedEndTime = normalizeTimestamp(event.end_time);

    // After normalization, validate the resulting dates are in a reasonable range
    const isValidTimestamp = (timestamp) => {
      if (!timestamp) return false;
      if (timestamp < minTimestampSeconds || timestamp > maxTimestampSeconds)
        return false;

      // Also check the resulting year is reasonable (2020-2030 for game events)
      const date = new Date(timestamp * 1000);
      const year = date.getFullYear();
      return year >= 2020 && year <= 2030;
    };

    const startDate = isValidTimestamp(normalizedStartTime)
      ? new Date(normalizedStartTime * 1000).toISOString().split("T")[0]
      : null;
    const expiryDate = isValidTimestamp(normalizedEndTime)
      ? new Date(normalizedEndTime * 1000).toISOString().split("T")[0]
      : null;

    // Debug: Log events with invalid timestamp ranges
    if (!startDate || !expiryDate) {
      console.log(`\n⚠ Event with invalid timestamp range:`);
      console.log(`  Name: ${event.name}`);
      console.log(
        `  start_time: ${event.start_time} (${event.start_time ? new Date(event.start_time * 1000).toISOString() : "null"})`,
      );
      console.log(
        `  end_time: ${event.end_time} (${event.end_time ? new Date(event.end_time * 1000).toISOString() : "null"})`,
      );
    }

    // Determine if it's daily login
    const isDailyLogin = event.type_name === "ActivityTypeSign";

    // Determine event type based on special_reward and duration
    let eventType = event.special_reward !== null ? "main" : "side";

    // Also check duration - if more than 30 days, it's a main event
    if (startDate && expiryDate) {
      const start = new Date(startDate);
      const expiry = new Date(expiryDate);
      const durationInDays = (expiry - start) / (1000 * 60 * 60 * 24);

      if (durationInDays > 30) {
        eventType = "main";
      }
    }

    // Format for database
    const formattedEvent = {
      game_id: parseInt(game.id),
      event_name: event.name,
      start_date: startDate,
      expiry_date: expiryDate,
      daily_login: isDailyLogin ? 1 : 0,
      event_type: eventType,
      background_url: event.image_url || null,
    };

    // Check if dates are valid
    const hasValidStartDate =
      formattedEvent.start_date &&
      !isNaN(Date.parse(formattedEvent.start_date));
    const hasValidExpiryDate =
      formattedEvent.expiry_date &&
      !isNaN(Date.parse(formattedEvent.expiry_date));

    if (hasValidStartDate && hasValidExpiryDate) {
      validEvents.push(formattedEvent);
    } else {
      invalidEvents.push(formattedEvent);
    }
  });

  // Save invalid events to file if any
  if (invalidEvents.length > 0) {
    const invalidEventsPath = path.join(__dirname, "../../invalid-events.json");
    const timestamp = new Date().toISOString();

    let existingData = [];
    if (fs.existsSync(invalidEventsPath)) {
      try {
        const fileContent = fs.readFileSync(invalidEventsPath, "utf8");
        if (fileContent.trim()) {
          existingData = JSON.parse(fileContent);
        }
      } catch (error) {
        console.warn(
          `Could not parse existing invalid-events.json: ${error.message}`,
        );
        existingData = [];
      }
    }

    const newData = {
      timestamp,
      gameId: game.id,
      gameTag: game.tag,
      source: "calendar",
      events: invalidEvents,
    };

    existingData.push(newData);
    fs.writeFileSync(
      invalidEventsPath,
      JSON.stringify(existingData, null, 2),
      "utf8",
    );

    console.log(
      `\n⚠ ${invalidEvents.length} calendar events with invalid dates saved to invalid-events.json`,
    );
  }

  if (ignoredCount > 0) {
    console.log(
      `\n⊘ ${ignoredCount} calendar events ignored based on configuration`,
    );
  }
  console.log(
    `\n✓ ${validEvents.length} valid calendar events ready for database import`,
  );
  return validEvents;
}

module.exports = {
  fetchHoyoverseEventsNotice,
  fetchHoyoverseEventsCalendar,
};
