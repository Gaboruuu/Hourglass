import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  NotificationPreferences,
  UiEventFilters,
  EventType,
  NotificationTime,
  GameEventNotificationPrefs,
  AnyEvent,
} from "./EventInteface";
import { logger } from "@/utils/logger";

export class FilterManager {
  private static readonly GAMES_PREFS_KEY = "user_games_preferences";
  private static readonly NOTIFICATION_PREFS_KEY = "notification_filters";
  private static readonly UI_FILTER_STORAGE_KEY = "ui_event_filters";

  // === DEFAULT PREFERENCES ===

  public static readonly DEFAULT_GAMES_PREFS: string[] = [];

  public static readonly DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
    enabled: false,
    gamePreferences: {},
  };

  public static readonly DEFAULT_GAME_PREFS: GameEventNotificationPrefs = {
    main: [],
    side: [],
    permanent: [],
  };

  public static readonly DEFAULT_UI_FILTERS: UiEventFilters = {
    games: [],
    eventTypes: ["side", "main", "permanent"],
    showActive: true,
    showExpired: false,
    sortBy: "expiry",
    sortOrder: "asc",
    searchText: "",
  };

  static async loadUserGamePreferences(): Promise<string[]> {
    try {
      const stored = await AsyncStorage.getItem(this.GAMES_PREFS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.selectedGames || this.DEFAULT_GAMES_PREFS;
      }
    } catch (error) {
      logger.error(
        "FilterManager",
        "Failed to load user game preferences from AsyncStorage",
        error,
      );
    }
    return this.DEFAULT_GAMES_PREFS;
  }

  static async saveUserGamePreferences(selectedGames: string[]): Promise<void> {
    try {
      const prefs = { selectedGames };
      await AsyncStorage.setItem(this.GAMES_PREFS_KEY, JSON.stringify(prefs));
      logger.info(
        "FilterManager",
        `Saved user game preferences: ${selectedGames.join(", ")}`,
      );
    } catch (error) {
      logger.error(
        "FilterManager",
        "Failed to save user game preferences to AsyncStorage",
        error,
      );
    }
  }

  static async getUserSelectedGames(): Promise<string[]> {
    return await this.loadUserGamePreferences();
  }

  /**
   * Returns user's selected games. If none selected, returns all available games.
   * Use this method when you need to filter data based on user preferences.
   */
  static async getAvailableGamesFiltered(
    events: AnyEvent[] = [],
  ): Promise<string[]> {
    const selectedGames = await this.loadUserGamePreferences();
    
    // If user hasn't selected any games, show all available games
    if (selectedGames.length === 0) {
      return await this.getAvailableGames(events);
    }
    
    return selectedGames;
  }

  /**
   * Check if a game is selected by user.
   * Returns true if game is selected OR if no games are selected (show all).
   */
  static async isGameSelectedByUser(gameName: string): Promise<boolean> {
    const selectedGames = await this.loadUserGamePreferences();
    
    // If no games selected, all games are considered "selected" (show all)
    if (selectedGames.length === 0) {
      return true;
    }
    
    return selectedGames.includes(gameName);
  }

  // === NOTIFICATION PREFERENCES ===

  static async loadNotificationPreferences(): Promise<NotificationPreferences> {
    try {
      const stored = await AsyncStorage.getItem(this.NOTIFICATION_PREFS_KEY);
      const globalEnabled = await AsyncStorage.getItem("notificationsEnabled");

      let prefs = this.DEFAULT_NOTIFICATION_PREFS;

      if (stored) {
        const parsed = JSON.parse(stored);
        prefs = { ...this.DEFAULT_NOTIFICATION_PREFS, ...parsed };
      }

      // Sync with global notification setting from settings screen
      prefs.enabled = globalEnabled === "true";

      return prefs;
    } catch (error) {
      logger.error(
        "FilterManager",
        "Failed to load notification preferences from AsyncStorage",
        error,
      );
    }
    return this.DEFAULT_NOTIFICATION_PREFS;
  }

  static async saveNotificationPreferences(
    prefs: NotificationPreferences,
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.NOTIFICATION_PREFS_KEY,
        JSON.stringify(prefs),
      );

      // Also sync the global notification setting
      await AsyncStorage.setItem(
        "notificationsEnabled",
        prefs.enabled.toString(),
      );

      logger.info(
        "FilterManager",
        `Saved notification preferences (global enabled: ${prefs.enabled})`,
      );
    } catch (error) {
      logger.error(
        "FilterManager",
        "Failed to save notification preferences to AsyncStorage",
        error,
      );
    }
  }

  static async setGlobalNotificationEnabled(enabled: boolean): Promise<void> {
    try {
      const prefs = await this.loadNotificationPreferences();
      prefs.enabled = enabled;
      await this.saveNotificationPreferences(prefs);
      logger.info(
        "FilterManager",
        `Global notifications ${enabled ? "enabled" : "disabled"}`,
      );
    } catch (error) {
      logger.error(
        "FilterManager",
        `Failed to ${enabled ? "enable" : "disable"} global notifications`,
        error,
      );
    }
  }

  static async getNotificationTimesForEvent(
    gameName: string,
    eventType: EventType,
  ): Promise<NotificationTime[]> {
    const prefs = await this.loadNotificationPreferences();

    if (!prefs.enabled) {
      return [];
    }

    // Check if this game is in user's selection
    const isGameSelected = await this.isGameSelectedByUser(gameName);
    if (!isGameSelected) {
      return [];
    }

    if (!prefs.gamePreferences[gameName]) {
      return this.DEFAULT_GAME_PREFS[eventType] || [];
    }

    const gamePrefs = prefs.gamePreferences[gameName];
    const times = gamePrefs[eventType] || [];
    return times;
  }

  static async shouldScheduleNotification(
    event: AnyEvent,
    notificationTime: NotificationTime,
  ): Promise<boolean> {
    const prefs = await this.loadNotificationPreferences();

    if (!prefs.enabled) return false;
    if (!event.event_type) return false;

    // Check if game is in user's selection (already checked in getNotificationTimesForEvent)
    const allowedTimes = await this.getNotificationTimesForEvent(
      event.game_name,
      event.event_type as EventType,
    );

    return allowedTimes.includes(notificationTime);
  }

  static async updateGameEventPreferences(
    gameName: string,
    eventType: EventType,
    notificationTimes: NotificationTime[],
  ): Promise<void> {
    const prefs = await this.loadNotificationPreferences();

    if (!prefs.gamePreferences[gameName]) {
      prefs.gamePreferences[gameName] = { ...this.DEFAULT_GAME_PREFS };
    }

    prefs.gamePreferences[gameName][eventType] = notificationTimes;

    await this.saveNotificationPreferences(prefs);
  }

  static async getAvailableGames(events: AnyEvent[]): Promise<string[]> {
    try {
      // Get games from API
      const response = await fetch(
        "https://hourglass-h6zo.onrender.com/api/games",
      );
      const apiGames = await response.json();
      const gameNames = apiGames.map(
        (game: { game_name: string }) => game.game_name,
      );

      // Also include games from permanent events if any are passed
      const permanentGames = [
        ...new Set(events.map((event) => event.game_name).filter(Boolean)),
      ];

      // Combine and deduplicate
      const allGames = [...new Set([...gameNames, ...permanentGames])];

      return allGames.sort();
    } catch (error) {
      console.error("Error fetching available games:", error);
      // Fallback to games from events parameter
      return [
        ...new Set(events.map((event) => event.game_name).filter(Boolean)),
      ];
    }
  }

  static getAvailableEventTypesForGame(
    events: AnyEvent[],
    gameName: string,
  ): EventType[] {
    const eventTypes = new Set(
      events
        .filter((event) => event.game_name === gameName)
        .map((event) => event.event_type as EventType),
    );
    return Array.from(eventTypes);
  }

  static async initializeGamePreferences(gameName: string): Promise<void> {
    const prefs = await this.loadNotificationPreferences();
    if (!prefs.gamePreferences[gameName]) {
      prefs.gamePreferences[gameName] = { ...this.DEFAULT_GAME_PREFS };
      await this.saveNotificationPreferences(prefs);
    }
  }

  /**
   * Filter events based on user's selected games.
   * If no games selected, returns all events (show all).
   */
  static async filterEventsByUserGames(
    events: AnyEvent[],
  ): Promise<AnyEvent[]> {
    const selectedGames = await this.loadUserGamePreferences();

    // If no games selected, show all events
    if (selectedGames.length === 0) {
      return events;
    }

    // Filter events to only include selected games
    return events.filter((event) => selectedGames.includes(event.game_name));
  }

  // === UI FILTERS ===

  static async loadUIFilters(): Promise<UiEventFilters> {
    try {
      const stored = await AsyncStorage.getItem(this.UI_FILTER_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...this.DEFAULT_UI_FILTERS, ...parsed };
      }
    } catch (error) {
      console.error("Error loading UI filters:", error);
    }
    return this.DEFAULT_UI_FILTERS;
  }

  static async saveUIFilters(filters: UiEventFilters): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.UI_FILTER_STORAGE_KEY,
        JSON.stringify(filters),
      );
    } catch (error) {
      console.error("Error saving UI filters:", error);
    }
  }

  static filterAndSortEventsForUI(
    events: AnyEvent[],
    filters: UiEventFilters,
  ): AnyEvent[] {
    let filteredEvents = events.filter((event) => {
      // Game filter
      if (
        filters.games.length > 0 &&
        !filters.games.includes(event.game_name)
      ) {
        return false;
      }

      // Event type filter
      if (
        event.event_type &&
        !filters.eventTypes.includes(event.event_type as EventType)
      ) {
        return false;
      }

      // Expired/Active filter
      const now = new Date();
      let isExpired = false;
      if (event.expiry_date) {
        // Parse as local date at 4 AM (server reset time)
        // Events expire at 4 AM on the expiry date, not at midnight or end of day
        const [year, month, day] = event.expiry_date.split("-").map(Number);
        const expiryDate = new Date(year, month - 1, day, 4, 0, 0, 0);
        isExpired = expiryDate < now;
      }

      if (isExpired && !filters.showExpired) return false;
      if (!isExpired && !filters.showActive) return false;

      // Search text filter
      if (filters.searchText) {
        const searchLower = filters.searchText.toLowerCase();
        const matchesName = event.event_name
          .toLowerCase()
          .includes(searchLower);
        const matchesGame = event.game_name.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesGame) return false;
      }

      return true;
    });

    filteredEvents.sort((a, b) => {
      let compareValue = 0;
      switch (filters.sortBy) {
        case "expiry":
          const aExpiry = a.expiry_date ? new Date(a.expiry_date).getTime() : 0;
          const bExpiry = b.expiry_date ? new Date(b.expiry_date).getTime() : 0;
          compareValue = aExpiry - bExpiry;
          break;
        case "name":
          compareValue = a.event_name.localeCompare(b.event_name);
          break;
        case "game":
          compareValue = a.game_name.localeCompare(b.game_name);
          break;
        case "type":
          // show first main, then side
          compareValue =
            (a.event_type === "main" ? 0 : a.event_type === "side" ? 1 : 2) -
            (b.event_type === "main" ? 0 : b.event_type === "side" ? 1 : 2);
          break;
      }
      return filters.sortOrder === "asc" ? compareValue : -compareValue;
    });
    return filteredEvents;
  }

  static getFilteredSummary(
    filters: UiEventFilters,
    totalEvents: number,
    filteredCount: number,
  ): string {
    const parts = [];
    if (filters.games.length > 0) {
      parts.push(
        `${filters.games.length} game${filters.games.length > 1 ? "s" : ""}`,
      );
    }

    if (filters.eventTypes.length < 3) {
      parts.push(filters.eventTypes.join(", "));
    }

    if (!filters.showActive) {
      parts.push("expired only");
    }
    if (!filters.showExpired) {
      parts.push("active only");
    }
    if (filters.searchText) {
      parts.push(`search: "${filters.searchText}"`);
    }

    const filterText = parts.length > 0 ? ` (${parts.join(", ")})` : "";
    return `${filteredCount}/${totalEvents} events${filterText}`;
  }
}
