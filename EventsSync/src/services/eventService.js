const { versionDates } = require("../config/versionDates");

async function batchCheckEvents(events, baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/events/batch-check`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(events),
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Unknown error" }));
      console.error(`\n✗ Backend error:`, errorData);
      throw new Error(
        `Backend responded with status ${response.status}: ${errorData.message}`,
      );
    }

    const data = await response.json();
    return data; // Returns { existing: [], new: [] }
  } catch (error) {
    if (error.code === "ECONNREFUSED") {
      console.error(`\n✗ Cannot connect to backend at ${baseUrl}`);
      console.error("  Make sure the backend server is running!");
    } else {
      console.error("Batch check error:", error.message);
    }
    throw error;
  }
}

async function createEvent(eventData, baseUrl) {
  const response = await fetch(`${baseUrl}/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventData),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  const data = await response.json();
  return data;
}

function fixEventDates(event, gameId, versionDates) {
  // Fix start_date if it's "After Version x.x" text
  if (event.start_date && isNaN(Date.parse(event.start_date))) {
    event.start_date = replaceStartDate(event.start_date, gameId, versionDates);
  }

  // Fix expiry_date if it's "End of Version x.x" text
  // Check for the pattern explicitly since Date.parse might parse it as valid
  const endOfVersionRegex = /End\s+of\s+Version\s+[\d.]+/i;
  if (
    event.expiry_date &&
    (isNaN(Date.parse(event.expiry_date)) ||
      endOfVersionRegex.test(event.expiry_date))
  ) {
    event.expiry_date = replaceExpiryDate(
      event.expiry_date,
      gameId,
      versionDates,
    );
  }

  if (
    (event.start_date && !isNaN(Date.parse(event.start_date))) ||
    (event.expiry_date && !isNaN(Date.parse(event.expiry_date)))
  ) {
    return true;
  } else {
    return false;
  }
}

function replaceStartDate(dateStr, gameId, versionDates) {
  const afterVersionRegex =
    /After\s+(?:the\s+)?Version\s+([\d.]+)(?:\s+(?:goes\s+live|update))?/i;
  const match = dateStr.match(afterVersionRegex);
  if (match) {
    const version = match[1];
    const gameVersions = getGameVersions(gameId, versionDates);
    if (gameVersions && gameVersions[version]) {
      return gameVersions[version];
    }
    return dateStr; // Return original if no matching version date found
  }
  return dateStr; // Return original if no match
}

function replaceExpiryDate(dateStr, gameId, versionDates) {
  const endOfVersionRegex = /End\s+of\s+Version\s+([\d.]+)/i;
  const match = dateStr.match(endOfVersionRegex);

  if (match) {
    const currentVersion = match[1];
    const gameVersions = getGameVersions(gameId, versionDates);

    if (gameVersions) {
      // Get the next version date
      const nextVersionDate = getNextVersionDate(currentVersion, gameVersions);

      if (nextVersionDate) {
        return nextVersionDate;
      }
    }
    return dateStr; // Return original if no next version found
  }
  return dateStr; // Return original if no match
}

function getGameVersions(gameId, versionDates) {
  const game = versionDates.find((g) => g.gameId === gameId);
  return game ? game.versions : null;
}

function getNextVersionDate(currentVersion, gameVersions) {
  // Get all version numbers and sort them
  const versions = Object.keys(gameVersions)
    .map((v) => parseFloat(v))
    .sort((a, b) => a - b);

  const currentVersionNum = parseFloat(currentVersion);

  // Find the next version
  const nextVersion = versions.find((v) => v > currentVersionNum);

  if (nextVersion) {
    return gameVersions[nextVersion.toString()];
  }

  return null; // No next version found
}

function getEventType(startDate, expiryDate) {
  // Check if start date is "After the version x.x" format
  const afterVersionRegex =
    /After\s+(?:the\s+)?Version\s+[\d.]+(?:\s+(?:goes\s+live|update))?/i;
  if (afterVersionRegex.test(startDate)) {
    return "main";
  }

  // Calculate duration if both dates are valid
  if (
    startDate &&
    expiryDate &&
    !isNaN(Date.parse(startDate)) &&
    !isNaN(Date.parse(expiryDate))
  ) {
    const start = new Date(startDate);
    const expiry = new Date(expiryDate);
    const durationInDays = (expiry - start) / (1000 * 60 * 60 * 24);

    // If duration is more than 30 days, it's a main event
    if (durationInDays > 30) {
      return "main";
    }
  }

  // Default to side event
  return "side";
}

module.exports = {
  batchCheckEvents,
  createEvent,
  fixEventDates,
  getEventType,
};
