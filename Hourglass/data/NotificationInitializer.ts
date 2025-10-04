import AsyncStorage from "@react-native-async-storage/async-storage";
import NotificationService from "@/data/NotificationManager";
import permanentEventsManager from "@/data/permanentEvents/PermanentEventsManager";
import { ProcessedEvent } from "@/data/permanentEvents/PermanentEventsManager";

/**
 * NotificationInitializer - Responsible for scheduling all notifications when the app starts
 */
export class NotificationInitializer {
  /**
   * Initialize notifications for both permanent events and regular events
   */
  static async initializeAllNotifications(): Promise<boolean> {
    try {
      // First, check if notifications are enabled by the user
      const notificationsEnabled = await AsyncStorage.getItem(
        "notificationsEnabled"
      );

      if (notificationsEnabled !== "true") {
        console.log(
          "Notifications are disabled by the user. Skipping scheduling."
        );
        return false;
      }

      // Configure notification handler
      NotificationService.configureNotifications();

      // Initialize permanent events notifications
      await this.initializePermanentEventNotifications();

      // Initialize regular events notifications (from API)
      await this.initializeRegularEventNotifications();

      return true;
    } catch (error) {
      console.error("Error initializing notifications:", error);
      return false;
    }
  }

  /**
   * Initialize notifications for permanent events
   */
  private static async initializePermanentEventNotifications(): Promise<void> {
    try {
      // Get all permanent events
      const permanentEvents = permanentEventsManager.getAllEvents();
      console.log(
        `Scheduling notifications for ${permanentEvents.length} permanent events`
      );

      // Schedule notifications for these events
      if (permanentEvents.length > 0) {
        await NotificationService.scheduleNotificationsForEvents(
          permanentEvents
        );
      }
    } catch (error) {
      console.error("Error initializing permanent event notifications:", error);
    }
  }

  /**
   * Initialize notifications for regular events fetched from API
   */
  private static async initializeRegularEventNotifications(): Promise<void> {
    try {
      // Fetch events from API
      const response = await fetch(
        "https://hourglass-h6zo.onrender.com/api/events"
      );
      const events = await response.json();

      if (!events || events.length === 0) {
        console.log("No events found from API");
        return;
      }

      // Convert API events to ProcessedEvent format
      const processedEvents: ProcessedEvent[] = events.map((event: any) => {
        return {
          id: event.event_id,
          event_name: event.event_name || "Unknown Event",
          game_name: event.game_title || "Unknown Game",
          background: "", // API events don't have background images
          daily_login:
            event.daily_login === "true" || event.daily_login === true,
          reset_type: "fixed_duration", // API events are considered fixed duration
          expire_date: event.expire_date,
        };
      });

      // Filter out events that don't have an expiration date
      const eventsWithExpiry = processedEvents.filter(
        (event) => event.expire_date
      );

      console.log(
        `Scheduling notifications for ${eventsWithExpiry.length} regular events from API`
      );

      // Schedule notifications for these events
      if (eventsWithExpiry.length > 0) {
        await NotificationService.scheduleNotificationsForEvents(
          eventsWithExpiry
        );
      }
    } catch (error) {
      console.error("Error initializing regular event notifications:", error);
    }
  }

  /**
   * Refresh notifications for all events
   * Call this when events change or when region changes
   */
  static async refreshAllNotifications(): Promise<boolean> {
    try {
      // Check when was the last time we refreshed notifications
      const lastRefresh = await AsyncStorage.getItem("lastNotificationRefresh");
      const now = new Date();

      // Only refresh if it's been more than 1 hour since the last refresh
      if (lastRefresh) {
        const lastRefreshTime = new Date(lastRefresh);
        const hoursSinceLastRefresh =
          (now.getTime() - lastRefreshTime.getTime()) / (1000 * 60 * 60);

        if (hoursSinceLastRefresh < 1) {
          console.log(
            `Skipping notification refresh - last refresh was ${Math.round(
              hoursSinceLastRefresh * 60
            )} minutes ago`
          );
          return true; // Return true even though we didn't actually refresh
        }
      }

      console.log("Starting notification refresh process...");

      // First clear existing notifications
      await NotificationService.cancelAllEventNotifications();

      // Then reinitialize all notifications
      const result = await this.initializeAllNotifications();

      // Update the last refresh time
      if (result) {
        await AsyncStorage.setItem(
          "lastNotificationRefresh",
          now.toISOString()
        );
      }

      return result;
    } catch (error) {
      console.error("Error refreshing notifications:", error);
      return false;
    }
  }
}

export default NotificationInitializer;
