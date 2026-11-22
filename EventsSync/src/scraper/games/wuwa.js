/** Wuthering Waves. Checked against the live pages on 2026-11-19. */
module.exports = {
  key: "wuwa",
  gameId: 5,
  enabled: true,
  // true: the scraper writes this game's events to the DB. (false = shadow mode, which needs an old
  // source in sync.js; there is none since every game went live on 2026-11-22)
  live: true, // switched 2026-11-22: the old source (Fandom wiki) stopped being updated
  slug: "Wuthering-Waves",
  pages: {
    events: { find: /^List of Events and Schedule$/i, url: "/games/Wuthering-Waves/archives/453473" },
  },
  sections: [
    // Home: "All Events and End Dates": two per row, "name <br> December 21, 2026" (end date only)
    { page: "home", heading: /^Wuthering Waves Events$/i, table: /^All Events and End Dates/i, status: "ongoing", layout: "multiPerRow", singleDate: "end" },
    { page: "home", heading: /^Wuthering Waves Events$/i, table: /^Upcoming Events/i, status: "upcoming", layout: "range", optional: true },
    // Events page: "Lahai-Roi Blocks | November 19, 2026 - December 3, 2026 Reach Union Level 14"
    { page: "events", heading: /^Ongoing Events$/i, status: "ongoing", layout: "range" },
    { page: "events", heading: /^Upcoming Events$/i, status: "upcoming", layout: "range", optional: true },
    // "<version> Events Summary": one <h4> per event with "Event Duration | November 12, 2026 - December 21, 2026"
    { page: "events", heading: /Events Summary$/i, status: "ongoing", layout: "headingPerEvent", itemLevel: "h4", optional: true },
  ],
  version: {
    // "Version 3.8", "3.8 Banners, Release Date, and Summary" (not a bare "3.7": that links to a 3.7 guide)
    find: /^(?:Version (\d+\.\d+)|(\d+\.\d+) Banners, Release Date, and Summary)$/i,
    // "Version 3.8 Schedule | November 12, 2026 - December 21, 2026" gives the whole version
    release: [{ schedule: /^Ver(?:sion|\.)\s*\d+\.\d+ Schedule$/i }, { heading: /Released on /i }],
    // "… maintenance period that ends at 11:00 AM (UTC+8)"
    releaseTime: { text: /maintenance period that ends at (\d{1,2}:\d{2}\s*[AP]M)\s*\((UTC\s*[+-]\s*\d{1,2})\)/i },
    cadenceDays: 42,
  },
  daily: { extraPatterns: [] },
};
