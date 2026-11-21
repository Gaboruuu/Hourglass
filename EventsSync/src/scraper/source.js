/**
 * Everything specific to the site we scrape. This is the only file that names it: switching to
 * another source means editing this file and the game configs in games/.
 */
module.exports = Object.freeze({
  name: "Game8",
  baseUrl: "https://game8.co",
  /** <baseUrl>/games/<slug> is a game's home page */
  gamePath: (slug) => `/games/${slug}`,
  /** Real (lazy-loaded) images are on this host; anything else is a placeholder */
  imageHost: "img.game8.co",
  /** A normal page's <title> contains this. A challenge / error page doesn't */
  titleMarker: /Game8/i,

  userAgent: "HourglassEventsSync/1.0 (personal project)",
  timeoutMs: 30_000,
  /** Pause between two requests */
  delayMs: 2_000,
});
