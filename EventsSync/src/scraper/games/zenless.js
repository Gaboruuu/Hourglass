/** Zenless Zone Zero. Checked against the live pages on 2026-11-19. */
module.exports = {
  key: "zenless",
  gameId: 2,
  enabled: true,
  // true: the scraper writes this game's events to the DB. false: shadow mode, the old source (legacy/)
  // still writes them and the scraper only shows up in the sync report. Switched per game in step 1f.
  live: true, // switched 2026-11-22 (running events with old-source dates were deleted first)
  slug: "Zenless-Zone-Zero",
  pages: {
    events: { find: /^All Events and Schedule$/i, url: "/games/Zenless-Zone-Zero/archives/457176" },
  },
  sections: [
    // Home: "All-New Program | 10/21/2026 - 12/01/2026"
    { page: "home", heading: /^Ongoing Events$/i, status: "ongoing", layout: "range" },
    { page: "home", heading: /^Upcoming Events$/i, status: "upcoming", layout: "range", optional: true },
    // Events page: "name | Start | October 22, 2026" + next row "End | November 30, 2026"
    { page: "events", heading: /Ongoing Event Schedule$/i, status: "ongoing", layout: "splitRows" },
    { page: "events", heading: /^List of All Upcoming Events$/i, status: "upcoming", layout: "splitRows", optional: true },
  ],
  version: {
    // "Version 3.4", "3.4 Release Date and Content Guide", "3.3 Release Date"
    find: /^(?:Version (\d+\.\d+)|(\d+\.\d+) Release Date(?: and Content Guide)?)$/i,
    // "Release Date | December 2, 2026"; older pages: "Phase 1 | October 21, 2026"
    release: [{ row: /^(?:Release Date|Phase 1)$/i }, { heading: /^Releases on /i }],
    releaseTime: null, // the pages give no clock time
    cadenceDays: 42,
  },
  daily: { extraPatterns: [] },
};
