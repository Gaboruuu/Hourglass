import {
  resolveGameKey,
  getGameIconSource,
  getGameInfo,
  GAME_ICONS,
  GAME_CANONICAL_NAMES,
} from "./gameIcons";

describe("gameIcons utility", () => {
  describe("resolveGameKey", () => {
    it("resolves short codes correctly", () => {
      expect(resolveGameKey("hsr")).toBe("hsr");
      expect(resolveGameKey("hi3")).toBe("hi3");
      expect(resolveGameKey("zzz")).toBe("zzz");
      expect(resolveGameKey("pgr")).toBe("pgr");
      expect(resolveGameKey("gi")).toBe("gi");
      expect(resolveGameKey("wuwa")).toBe("wuwa");
    });

    it("resolves canonical game names correctly", () => {
      expect(resolveGameKey("Honkai: Star Rail")).toBe("hsr");
      expect(resolveGameKey("Honkai Impact 3rd")).toBe("hi3");
      expect(resolveGameKey("Zenless Zone Zero")).toBe("zzz");
      expect(resolveGameKey("Punishing Gray Raven")).toBe("pgr");
      expect(resolveGameKey("Genshin Impact")).toBe("gi");
      expect(resolveGameKey("Wuthering Waves")).toBe("wuwa");
    });

    it("resolves database numerical IDs", () => {
      expect(resolveGameKey(1)).toBe("hi3");
      expect(resolveGameKey("1")).toBe("hi3");
      expect(resolveGameKey(2)).toBe("zzz");
      expect(resolveGameKey("2")).toBe("zzz");
      expect(resolveGameKey(3)).toBe("hsr");
      expect(resolveGameKey("3")).toBe("hsr");
      expect(resolveGameKey(4)).toBe("gi");
      expect(resolveGameKey("4")).toBe("gi");
      expect(resolveGameKey(5)).toBe("wuwa");
      expect(resolveGameKey("5")).toBe("wuwa");
    });

    it("resolves permanent event IDs", () => {
      expect(resolveGameKey("memory_of_chaos")).toBe("hsr");
      expect(resolveGameKey("pure_fiction")).toBe("hsr");
      expect(resolveGameKey("apocalyptic_shadow")).toBe("hsr");
      expect(resolveGameKey("tower_of_adversity_hazard_zone")).toBe("wuwa");
      expect(resolveGameKey("whimpering_wastes")).toBe("wuwa");
      expect(resolveGameKey("shiyu_defense")).toBe("zzz");
      expect(resolveGameKey("superstring_dimension")).toBe("hi3");
      expect(resolveGameKey("spiral_abyss")).toBe("gi");
      expect(resolveGameKey("imaginarium_theater")).toBe("gi");
    });

    it("handles null or undefined or unknown", () => {
      expect(resolveGameKey(null)).toBeNull();
      expect(resolveGameKey(undefined)).toBeNull();
      expect(resolveGameKey("nonexistent_game_xyz")).toBeNull();
    });
  });

  describe("getGameIconSource", () => {
    it("returns icon asset for valid games", () => {
      expect(getGameIconSource("Honkai: Star Rail")).toBeDefined();
      expect(getGameIconSource("hsr")).toBeDefined();
      expect(getGameIconSource(4)).toBeDefined(); // Genshin Impact
    });

    it("returns null for unknown games", () => {
      expect(getGameIconSource("random_thing")).toBeNull();
      expect(getGameIconSource(null)).toBeNull();
    });
  });

  describe("getGameInfo", () => {
    it("resolves from notification with standard gameName", () => {
      const info = getGameInfo({
        gameId: "4",
        gameName: "Genshin Impact",
        eventName: "Lantern Rite",
      });
      expect(info.name).toBe("Genshin Impact");
      expect(info.icon).toBe(GAME_ICONS.gi);
      expect(info.id).toBe("gi");
    });

    it("resolves from notification with permanent event gameId", () => {
      const info = getGameInfo({
        gameId: "memory_of_chaos",
        gameName: "",
        eventName: "Memory of Chaos",
      });
      expect(info.name).toBe("Honkai: Star Rail");
      expect(info.icon).toBe(GAME_ICONS.hsr);
      expect(info.id).toBe("hsr");
    });

    it("resolves from notification with only body text", () => {
      const info = getGameInfo({
        gameId: "unknown",
        gameName: "Unknown Game",
        body: "Event in Wuthering Waves will expire in 2 hours. Don't miss out!",
      });
      expect(info.name).toBe("Wuthering Waves");
      expect(info.icon).toBe(GAME_ICONS.wuwa);
      expect(info.id).toBe("wuwa");
    });

    it("handles completely unknown notifications gracefully", () => {
      const info = getGameInfo({
        gameId: "random_id",
        gameName: "Custom Game",
        body: "Some message",
      });
      expect(info.name).toBe("Custom Game");
      expect(info.icon).toBeNull();
      expect(info.id).toBe("random_id");
    });
  });
});
