import { ApiEvent, ProcessedEvent, AnyEvent } from "./EventInteface";
import permanentEventsManager from "./permanentEvents/PermanentEventsManager";
import { logger } from "@/utils/logger";
import { NotificationService } from "./NotificationManager";
import { FilterManager } from "./FilterManager";

class EventsDataManager {
  private apiEvents: ApiEvent[] = [];
  private permanentEvents: ProcessedEvent[] = [];
  private expiredApiEvents: ApiEvent[] = [];
  private games: string[] = [];
  private listeners: Set<() => void> = new Set();
  private isInitialized: boolean = false;
  private refreshInterval: NodeJS.Timeout | null = null;
  private notificationsEnabled: boolean = false;
  private regionContext: any = null; // Store region context for date parsing

  /**
   * Initialize the data manager - fetch all data and start refresh interval
   */
  async initialize() {
    if (this.isInitialized) {
      logger.info("EventsDataManager", "Already initialized, skipping");
      return;
    }

    logger.info("EventsDataManager", "Initializing...");

    try {
      await this.loadNotificationPreferences();
      // Fetch API events
      await this.refreshApiEvents();

      // Load permanent events (only once)
      this.permanentEvents = permanentEventsManager.getSortedByExpiration();
      logger.info(
        "EventsDataManager",
        `Loaded ${this.permanentEvents.length} permanent events`,
      );

      // Extract unique games from both event types
      this.extractGames();

      if (this.notificationsEnabled) {
        await this.scheduleAllNotifications();
      }

      // Set up hourly refresh for API events
      this.startRefreshInterval();

      this.isInitialized = true;
      logger.success("EventsDataManager", "Initialization complete");
    } catch (error) {
      logger.error("EventsDataManager", "Initialization failed", error);
    }
  }

  /**
   * Load notification preference from storage
   */
  private async loadNotificationPreferences() {
    try {
      const prefs = await FilterManager.loadNotificationPreferences();
      this.notificationsEnabled = prefs.enabled;
      logger.info(
        "EventsDataManager",
        `Notifications ${this.notificationsEnabled ? "enabled" : "disabled"}`,
      );
    } catch (error) {
      logger.error(
        "EventsDataManager",
        "Failed to load notification preferences",
        error,
      );
    }
  }

  /**
   * Fetch API events from backend and filter expired ones
   */
  async refreshApiEvents() {
    try {
      logger.info("EventsDataManager", "Fetching API events...");
      const response = await fetch(
        "https://hourglass-h6zo.onrender.com/api/events",
      );
      const data: ApiEvent[] = await response.json();

      // Filter out expired events
      const { active, expired } = this.separateEventsByExpiry(data);
      this.apiEvents = active;
      this.expiredApiEvents = expired;

      logger.info(
        "EventsDataManager",
        `Fetched ${data.length} API events, ${this.apiEvents.length} active after filtering expired`,
      );

      // Update games list when API events change
      this.extractGames();

      if (this.notificationsEnabled && this.isInitialized) {
        await this.scheduleApiEventsNotifications();
      }

      // Notify all listeners about the update
      this.notifyListeners();
    } catch (error) {
      logger.error("EventsDataManager", "Failed to fetch API events", error);
    }
  }

  /**
   * Separate events into active and expired
   * Events expire at 4 AM in the user's region (server reset time)
   */
  private separateEventsByExpiry(events: ApiEvent[]): {
    active: ApiEvent[];
    expired: ApiEvent[];
  } {
    const now = new Date();
    const active: ApiEvent[] = [];
    const expired: ApiEvent[] = [];

    events.forEach((event) => {
      let expiryDate: Date;

      if (this.regionContext && this.regionContext.getResetTimeForDate) {
        // Use region-aware reset time (4 AM in user's region)
        const eventDate = new Date(event.expiry_date);
        expiryDate = this.regionContext.getResetTimeForDate(eventDate);
      } else {
        // Fallback: parse as local date at 4 AM
        const [year, month, day] = event.expiry_date.split("-").map(Number);
        expiryDate = new Date(year, month - 1, day, 4, 0, 0, 0);
      }

      if (expiryDate.getTime() > now.getTime()) {
        active.push(event);
      } else {
        expired.push(event);
      }
    });

    return { active, expired };
  }

  /**
   * Filter out expired events based on expiry_date (keep for backward compatibility)
   * Events expire at 4 AM in the user's region (server reset time)
   * @deprecated Use separateEventsByExpiry instead
   */
  private filterExpiredEvents(events: ApiEvent[]): ApiEvent[] {
    const now = new Date();
    return events.filter((event) => {
      let expiryDate: Date;

      if (this.regionContext && this.regionContext.getResetTimeForDate) {
        // Use region-aware reset time (4 AM in user's region)
        const eventDate = new Date(event.expiry_date);
        expiryDate = this.regionContext.getResetTimeForDate(eventDate);
      } else {
        // Fallback: parse as local date at 4 AM
        const [year, month, day] = event.expiry_date.split("-").map(Number);
        expiryDate = new Date(year, month - 1, day, 4, 0, 0, 0);
      }

      return expiryDate.getTime() > now.getTime();
    });
  }

  /**
   * Schedule notifications for all events (API + permanent)
   */
  private async scheduleAllNotifications() {
    try {
      logger.info(
        "EventsDataManager",
        "Scheduling notifications for all events",
      );

      // Filter out permanent events with "upcoming" status
      const notUpcomingPermanentEvents = this.permanentEvents.filter(
        (event) => event.status !== "upcoming",
      );

      let allEvents = [...this.apiEvents, ...notUpcomingPermanentEvents];

      // Filter by user's selected games
      allEvents = (await FilterManager.filterEventsByUserGames(allEvents)) as (
        | ApiEvent
        | ProcessedEvent
      )[];

      await NotificationService.scheduleNotificationsForEvents(allEvents);

      logger.success(
        "EventsDataManager",
        `Scheduled notifications for ${allEvents.length} events after filtering by user games`,
      );
    } catch (error) {
      logger.error(
        "EventsDataManager",
        "Failed to schedule all notifications",
        error,
      );
    }
  }

  /**
   * Schedule notifications only for API events
   */
  private async scheduleApiEventsNotifications() {
    try {
      logger.info("EventsDataManager", "Rescheduling API event notifications");

      // Filter by user's selected games
      const filteredApiEvents = (await FilterManager.filterEventsByUserGames(
        this.apiEvents,
      )) as ApiEvent[];

      // Cancel existing API event notifications (for all, including filtered out ones)
      for (const event of this.apiEvents) {
        await NotificationService.cancelNotification(
          `event-${event.event_id}-3days`,
        );
        await NotificationService.cancelNotification(
          `event-${event.event_id}-1day`,
        );
        await NotificationService.cancelNotification(
          `event-${event.event_id}-2hours`,
        );
      }

      // Reschedule only for filtered events
      await NotificationService.scheduleNotificationsForEvents(
        filteredApiEvents,
      );

      logger.success(
        "EventsDataManager",
        `Rescheduled notifications for ${filteredApiEvents.length} API events after filtering by user games`,
      );
    } catch (error) {
      logger.error(
        "EventsDataManager",
        "Failed to reschedule API event notifications",
        error,
      );
    }
  }

  /**
   * Enable or disable notifications
   */
  async setNotificationsEnabled(enabled: boolean) {
    this.notificationsEnabled = enabled;
    logger.info(
      "EventsDataManager",
      `Notifications ${enabled ? "enabled" : "disabled"}`,
    );

    if (enabled) {
      // Schedule all notifications
      await this.scheduleAllNotifications();
    } else {
      // Cancel all notifications
      await NotificationService.cancelAllEventNotifications();
      logger.info("EventsDataManager", "Cancelled all notifications");
    }
  }

  /**
   * Refresh notifications (useful when preferences change)
   */
  async refreshNotifications() {
    await this.loadNotificationPreferences();

    if (this.notificationsEnabled) {
      await this.scheduleAllNotifications();
    }
  }

  /**
   * Sync permanent events with region context and refresh
   */
  async syncWithRegion(regionContext: any) {
    logger.info(
      "EventsDataManager",
      `Syncing with region: ${regionContext.region}`,
    );

    try {
      // Store region context for date parsing
      this.regionContext = regionContext;

      // Sync permanent events manager with new region
      permanentEventsManager.syncWithRegionContext(regionContext);

      // Reload permanent events with new region timing
      this.permanentEvents = permanentEventsManager.getSortedByExpiration();

      logger.info(
        "EventsDataManager",
        `Reloaded ${this.permanentEvents.length} permanent events for region ${regionContext.region}`,
      );

      // Update games list (might have changed)
      this.extractGames();

      // Reschedule notifications with new region timing
      if (this.notificationsEnabled) {
        await this.scheduleAllNotifications();
      }

      // Notify listeners
      this.notifyListeners();
    } catch (error) {
      logger.error(
        "EventsDataManager",
        `Failed to sync with region ${regionContext.region}`,
        error,
      );
    }
  }

  /**
   * Extract unique game names from both API and permanent events
   */
  private extractGames() {
    const gameSet = new Set<string>();

    // Add games from API events
    this.apiEvents.forEach((event) => {
      if (event.game_name) {
        gameSet.add(event.game_name);
      }
    });

    // Add games from permanent events
    this.permanentEvents.forEach((event) => {
      if (event.game_name) {
        gameSet.add(event.game_name);
      }
    });

    this.games = Array.from(gameSet).sort();
    logger.info(
      "EventsDataManager",
      `Extracted ${this.games.length} unique games: ${this.games.join(", ")}`,
    );
  }

  /**
   * Start the hourly refresh interval for API events
   */
  private startRefreshInterval() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Refresh API events every hour (3600000ms)
    this.refreshInterval = setInterval(() => {
      logger.info("EventsDataManager", "Hourly refresh triggered");
      this.refreshApiEvents();
    }, 3600000);

    logger.info("EventsDataManager", "Started hourly refresh interval");
  }

  /**
   * Stop the refresh interval (useful for cleanup)
   */
  stopRefreshInterval() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      logger.info("EventsDataManager", "Stopped refresh interval");
    }
  }

  /**
   * Subscribe to data updates
   * @returns Unsubscribe function
   */
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    logger.info(
      "EventsDataManager",
      `Listener subscribed, total: ${this.listeners.size}`,
    );

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
      logger.info(
        "EventsDataManager",
        `Listener unsubscribed, total: ${this.listeners.size}`,
      );
    };
  }

  /**
   * Notify all subscribed listeners about data updates
   */
  private notifyListeners() {
    logger.info(
      "EventsDataManager",
      `Notifying ${this.listeners.size} listeners`,
    );
    this.listeners.forEach((callback) => callback());
  }

  /**
   * Get all API events (filtered, no expired)
   */
  getApiEvents(): ApiEvent[] {
    return this.apiEvents;
  }

  /**
   * Get all permanent events
   */
  getPermanentEvents(): ProcessedEvent[] {
    return this.permanentEvents;
  }

  /**
   * Get all combined events (API + permanent)
   */
  getAllEvents(): AnyEvent[] {
    return [...this.apiEvents, ...this.permanentEvents];
  }

  /**
   * Get list of unique game names
   */
  getGamesList(): string[] {
    return this.games;
  }

  /**
   * Get expired API events
   */
  getExpiredApiEvents(): ApiEvent[] {
    return this.expiredApiEvents;
  }

  /**
   * Check if the manager is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Force refresh all data (useful for manual refresh)
   */
  async forceRefresh() {
    logger.info("EventsDataManager", "Force refresh triggered");
    await this.refreshApiEvents();
    // Permanent events don't need refresh as they're static
  }
}

// Export singleton instance
export default new EventsDataManager();
