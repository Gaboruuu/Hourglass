/** Honkai: Star Rail. Checked against the live pages on 2026-11-19. */
module.exports = {
  key: "starrail",
  gameId: 3,
  enabled: true,
  // true: the scraper writes this game's events to the DB. false: shadow mode, the old source (legacy/)
  // still writes them and the scraper only shows up in the sync report. Switched per game in step 1f.
  live: true, // switched 2026-11-22 (running events with old-source dates were deleted first)
  slug: "Honkai-Star-Rail",
  pages: {
    events: { find: /^All Events and Schedules?$/i, url: "/games/Honkai-Star-Rail/archives/408749" },
  },
  sections: [
    // Home: two events per row, "name <hr> 11/11/2026 - 12/23/2026"
    { page: "home", heading: /^Current Events$/i, status: "ongoing", layout: "multiPerRow" },
    { page: "home", heading: /^Upcoming Events$/i, status: "upcoming", layout: "multiPerRow", optional: true },
    // Events page: one <h3> per current event with "Duration | Nov. 11, 2026 - Dec. 23, 2026"
    { page: "events", heading: /Star Rail Current Events$/i, status: "ongoing", layout: "headingPerEvent", itemLevel: "h3" },
    // "4.7 Planar Fissure | Start: 11/23/2026 - 12/07/2026 Get double …"
    { page: "events", heading: /^Star Rail [\d.]+ Upcoming Events$/i, status: "upcoming", layout: "range", optional: true },
  ],
  version: {
    find: /^Version (\d+\.\d+)$/i,
    // "Release Date | November 10, 2026 (NA Servers) November 11, 2026 (EU/Asia Servers)" → the EU/Asia date
    release: [{ row: /^Release Date$/i }],
    // "Asia | November 11, 2026 11:00 AM (UTC/GMT+8)"
    releaseTime: "serverTable",
    cadenceDays: 42,
  },
  daily: { extraPatterns: [] },
};
