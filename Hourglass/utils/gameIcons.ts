/**
 * gameIcons.ts
 * Centralized utility for resolving game display names, icons, and IDs.
 */

export const GAME_ICONS: { [key: string]: any } = {
  hsr: require("@/assets/icons/hsr_icon.jpg"),
  hi3: require("@/assets/icons/hi3_icon.jpg"),
  zzz: require("@/assets/icons/zzz_icon.jpg"),
  pgr: require("@/assets/icons/pgr_icon.jpg"),
  gi: require("@/assets/icons/gi_icon.jpg"),
  wuwa: require("@/assets/icons/wuwa_icon.jpg"),
};

export const GAME_CANONICAL_NAMES: { [key: string]: string } = {
  hsr: "Honkai: Star Rail",
  hi3: "Honkai Impact 3rd",
  zzz: "Zenless Zone Zero",
  pgr: "Punishing Gray Raven",
  gi: "Genshin Impact",
  wuwa: "Wuthering Waves",
};

/**
 * Maps game IDs, DB IDs, permanent event keys, and aliases to standard game codes (hsr, hi3, zzz, pgr, gi, wuwa)
 */
const GAME_ALIAS_MAP: { [key: string]: string } = {
  // Direct codes
  hsr: "hsr",
  hi3: "hi3",
  zzz: "zzz",
  pgr: "pgr",
  gi: "gi",
  wuwa: "wuwa",

  // Database numerical IDs
  "1": "hi3",
  "2": "zzz",
  "3": "hsr",
  "4": "gi",
  "5": "wuwa",
  "6": "pgr",

  // Full names (lowercase)
  "honkai: star rail": "hsr",
  "honkai star rail": "hsr",
  "honkai impact 3rd": "hi3",
  "honkai impact": "hi3",
  "zenless zone zero": "zzz",
  "punishing gray raven": "pgr",
  "punishing: gray raven": "pgr",
  "genshin impact": "gi",
  "wuthering waves": "wuwa",

  // Permanent event IDs and keys
  memory_of_chaos: "hsr",
  pure_fiction: "hsr",
  apocalyptic_shadow: "hsr",
  anomaly_arbitration: "hsr",
  moc_hsr: "hsr",
  pf_hsr: "hsr",
  as_hsr: "hsr",
  aa_hsr: "hsr",

  superstring_dimension: "hi3",
  elysia_realm: "hi3",
  hi3_abyss: "hi3",
  er_hi3: "hi3",

  shiyu_defense: "zzz",
  sd_zzz: "zzz",

  tower_of_adversity_hazard_zone: "wuwa",
  tower_of_adversity: "wuwa",
  whimpering_wastes: "wuwa",
  toa_wuwa: "wuwa",
  ww_wuwa: "wuwa",

  spiral_abyss: "gi",
  imaginarium_theater: "gi",
  sa_gi: "gi",
  it_gi: "gi",
};

/**
 * Resolves a game key from any input (gameName, gameId, eventName, etc.)
 */
export function resolveGameKey(identifier?: string | number | null): string | null {
  if (identifier == null) return null;

  const str = String(identifier).trim().toLowerCase();
  if (GAME_ALIAS_MAP[str]) {
    return GAME_ALIAS_MAP[str];
  }

  // Substring fuzzy matching
  if (str.includes("star rail") || str.includes("hsr")) return "hsr";
  if (str.includes("honkai impact") || str.includes("hi3")) return "hi3";
  if (str.includes("zenless") || str.includes("zzz")) return "zzz";
  if (str.includes("punishing") || str.includes("gray raven") || str.includes("pgr")) return "pgr";
  if (str.includes("genshin") || str.includes("gi")) return "gi";
  if (str.includes("wuthering") || str.includes("wuwa")) return "wuwa";

  return null;
}

/**
 * Gets the original icon image asset source for a given game identifier.
 */
export function getGameIconSource(identifier?: string | number | null): any {
  const key = resolveGameKey(identifier);
  return key ? GAME_ICONS[key] || null : null;
}

/**
 * Comprehensive resolution for notifications in notification history.
 * Inspects gameId, gameName, eventName, title, and body to determine the game name and original icon.
 */
export function getGameInfo(notification?: {
  gameId?: string | number | null;
  gameName?: string | null;
  eventName?: string | null;
  title?: string | null;
  body?: string | null;
}): { name: string; icon: any; id: string } {
  if (!notification) {
    return { name: "Unknown Game", icon: null, id: "unknown" };
  }

  // Try in order: gameName, gameId, title, body, eventName
  const resolvedKey =
    resolveGameKey(notification.gameName) ||
    resolveGameKey(notification.gameId) ||
    resolveGameKey(notification.title) ||
    resolveGameKey(notification.body) ||
    resolveGameKey(notification.eventName);

  if (resolvedKey && GAME_CANONICAL_NAMES[resolvedKey]) {
    return {
      name: notification.gameName && notification.gameName.trim().length > 0 && !notification.gameName.startsWith("Unknown")
        ? notification.gameName
        : GAME_CANONICAL_NAMES[resolvedKey],
      icon: GAME_ICONS[resolvedKey] || null,
      id: resolvedKey,
    };
  }

  return {
    name: notification.gameName || "Unknown Game",
    icon: null,
    id: String(notification.gameId || "unknown"),
  };
}
