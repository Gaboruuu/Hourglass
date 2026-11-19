const axios = require("axios");
const cheerio = require("cheerio");
const { fixEventDates, getEventType } = require("../services/eventService");
const { versionDates } = require("../config/versionDates");
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
 * Load daily events from configuration file
 */
function loadDailyEvents() {
  const dailyEventsPath = path.join(__dirname, "../../daily-events.json");
  try {
    if (fs.existsSync(dailyEventsPath)) {
      const fileContent = fs.readFileSync(dailyEventsPath, "utf8");
      const data = JSON.parse(fileContent);
      return data.daily_events || [];
    }
  } catch (error) {
    console.warn(`Could not load daily-events.json: ${error.message}`);
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

/**
 * Check if an event is a daily event based on configuration
 */
function isDailyEvent(eventName, gameId, dailyEvents) {
  return dailyEvents.some((daily) => {
    const gameIdMatch =
      daily.gameId === gameId || daily.gameId === String(gameId);
    const nameMatch = eventName
      .toLowerCase()
      .includes(daily.eventName.toLowerCase());
    return gameIdMatch && nameMatch;
  });
}

/**
 * Fetch events from Wuthering Waves Fandom Wiki and transform to standard format
 * @param {Object} game - Game object with id and tag
 * @returns {Promise<Array>} Array of formatted event objects
 */
async function fetchWuWaEvents(game) {
  console.log(`Fetching Wuthering Waves events from Fandom Wiki`);

  const response = await axios.get(
    "https://wutheringwaves.fandom.com/api.php",
    {
      params: {
        action: "parse",
        page: "Event",
        prop: "text",
        format: "json",
      },
      headers: { "User-Agent": "HourglassBot/1.0" },
    },
  );

  const html = response.data.parse.text["*"];
  const $ = cheerio.load(html);
  const rawEvents = [];
  let currentSection = "unknown";

  $("h3, table.article-table").each((_, el) => {
    if (el.tagName === "h3") {
      currentSection = $(el).find(".mw-headline").text().trim().toLowerCase();
      return;
    }

    $(el)
      .find("tbody tr")
      .each((i, row) => {
        if (i === 0) return;
        const cols = $(row).find("td");
        if (cols.length < 3) return;

        const links = $(cols[0]).find("a");
        const name = links.last().attr("title") || links.last().text().trim();
        const sortValue = $(cols[1]).attr("data-sort-value") || "";
        const imgEl = $(cols[0]).find("img");
        const rawUrl = imgEl.attr("data-src") || imgEl.attr("src") || null;
        const imageUrl = rawUrl
          ? rawUrl.replace("/scale-to-width-down/200", "")
          : null;

        const datePattern = /(\d{4}-\d{2}-\d{2})/g;
        const dates = sortValue.match(datePattern);

        let startDate = null,
          endDate = null;
        if (dates && dates.length >= 2) {
          // The dates in the sort-value are reversed (end date first)
          endDate = dates[0];
          startDate = dates[1];
        } else if (dates && dates.length === 1) {
          startDate = dates[0];
          endDate = null;
        }

        // Fallback: Extract date from event name if no dates in sort value
        // Pattern: "Event Name/YYYY-MM-DD"
        if (!startDate && !endDate && name) {
          const nameDate = name.match(/\/(\d{4}-\d{2}-\d{2})$/);
          if (nameDate) {
            // Use the date from the name
            startDate = nameDate[1];
            // Set default expiry date 30 days after start
            const startDateObj = new Date(nameDate[1]);
            startDateObj.setDate(startDateObj.getDate() + 30);
            const year = startDateObj.getFullYear();
            const month = String(startDateObj.getMonth() + 1).padStart(2, "0");
            const day = String(startDateObj.getDate()).padStart(2, "0");
            endDate = `${year}-${month}-${day}`;
          }
        }

        // Remove date suffix from event name (for all events)
        const cleanName = name.replace(/\/\d{4}-\d{2}-\d{2}$/, "");

        // Skip permanent events section
        if (name && currentSection !== "permanent") {
          rawEvents.push({
            title: cleanName,
            start_date: startDate,
            expiry_date: endDate,
            version: $(cols[2]).text().trim(),
            background_url: imageUrl,
          });
        }
      });
  });

  console.log(`\n✓ Found ${rawEvents.length} events from Fandom Wiki`);

  // Load configurations
  const ignoredEvents = loadIgnoredEvents();
  const dailyEvents = loadDailyEvents();

  // Process events: fix dates and format for database
  const validEvents = [];
  const invalidEvents = [];
  let ignoredCount = 0;

  rawEvents.forEach((event) => {
    // Check if event should be ignored
    if (shouldIgnoreEvent(event.title, game.id, ignoredEvents)) {
      ignoredCount++;
      return;
    }

    // Check if it's a daily login event from daily-events.json
    const isDailyLogin = isDailyEvent(event.title, game.id, dailyEvents);

    // Determine event type before fixing dates
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
      daily_login: isDailyLogin ? 1 : 0,
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
      source: "fandom-wiki",
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

module.exports = {
  fetchWuWaEvents,
};
