/** Genshin Impact. Checked against the live pages on 2026-11-19. */
module.exports = {
  key: "genshin",
  gameId: 4,
  enabled: true,
  // true: the scraper writes this game's events to the DB. false: shadow mode, the old source (legacy/)
  // still writes them and the scraper only shows up in the sync report. Switched per game in step 1f.
  live: true, // switched 2026-11-22 (running events with old-source dates were deleted first)
  slug: "Genshin-Impact",
  pages: {
    events: { find: /^(?:List of Current & Upcoming Events|All Events)$/i, url: "/games/Genshin-Impact/archives/301601" },
  },
  sections: [
    // Home: "Starlit Gala | 10/01/2026 - 11/03/2026 <hr> rewards"
    { page: "home", heading: /^Current Events$/i, status: "ongoing", layout: "range" },
    { page: "home", heading: /^Upcoming Events$/i, status: "upcoming", layout: "range", optional: true },
    // Events page: one <h3> per event with "Event Start | November 4, 2026" / "Event End | …"
    { page: "events", heading: /^List of Current Events$/i, status: "ongoing", layout: "headingPerEvent", itemLevel: "h3" },
    { page: "events", heading: /^List of Upcoming Events$/i, status: "upcoming", layout: "headingPerEvent", itemLevel: "h3", optional: true },
    // Stygian Onslaught (recurring end-game mode, not hard-coded in the app). Character Test Runs
    // ("Test Run Start") and the Battle Pass (no dates) in the same section are skipped.
    { page: "events", heading: /^Recurring Events$/i, status: "ongoing", layout: "headingPerEvent", itemLevel: "h3", optional: true },
  ],
  version: {
    // "Version 7.3", "Version 7.2 Release", "Version 7.1 Release Date and Characters"
    find: /^Version (\d+\.\d+)(?: Release(?: Date and Characters)?)?$/i,
    release: [{ heading: /^Released on /i }, { heading: /^Releases? on /i }],
    // Maintenance table: "Asia | November 4, 2026 7:00 AM~12:00 PM (UTC/GMT+8)"
    releaseTime: "serverTable",
    cadenceDays: 42,
  },
  daily: { extraPatterns: [] },
};
