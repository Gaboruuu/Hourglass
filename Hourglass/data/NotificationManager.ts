import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import {
  ProcessedEvent,
  NotificationTime,
  ApiEvent,
  AnyEvent,
} from "@/data/EventInteface";
import { FilterManager } from "./FilterManager";
import { logger } from "@/utils/logger";
import { resolveGameKey, GAME_CANONICAL_NAMES } from "@/utils/gameIcons";

export interface NotificationHistoryEntry {
  gameName: string;
  gameId: string;
  eventName: string;
  eventType: "main" | "side" | "permanent";
  notificationType: "3days" | "1day" | "2hours";
  timestamp: number;
  title: string;
  body: string;
  isGroup?: boolean;
  groupedEventNames?: string[];
}

export class NotificationService {
  private static isConfigured = false;
  private static permissionsGrantedLogged = false;

  private static onNotificationTriggered:
    | ((entry: NotificationHistoryEntry) => void)
    | null = null;
  private static onNotificationScheduled:
    | ((entry: {
        id: string;
        gameName: string;
        gameId: string;
        eventName: string;
        eventType: "main" | "side" | "permanent";
        notificationType: "3days" | "1day" | "2hours";
        timestamp: number;
        title: string;
        body: string;
        isGroup?: boolean;
        groupedEventNames?: string[];
      }) => void)
    | null = null;
  private static onNotificationCancelled: ((id: string) => void) | null = null;

  private static notificationReceivedListener: any = null;

  // Register a callback to be called when notifications are actually triggered/received
  static setNotificationTriggeredCallback(
    callback: (entry: NotificationHistoryEntry) => void,
  ) {
    this.onNotificationTriggered = callback;
  }

  static setNotificationScheduledCallback(
    callback: (entry: any) => void,
  ) {
    this.onNotificationScheduled = callback;
  }

  static setNotificationCancelledCallback(
    callback: (id: string) => void,
  ) {
    this.onNotificationCancelled = callback;
  }

  // Request permission to send notifications
  static async requestPermissions() {
    if (!Device.isDevice) {
      logger.warning(
        "NotificationService",
        "Running on emulator - notifications require physical device",
      );
      return false;
    }

    try {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        logger.warning(
          "NotificationService",
          `User denied notification permissions (status: ${finalStatus})`,
        );
        return false;
      }

      // Only log once when permissions are first confirmed as granted
      if (!this.permissionsGrantedLogged) {
        logger.success(
          "NotificationService",
          "User granted notification permissions",
        );
        this.permissionsGrantedLogged = true;
      }
      return true;
    } catch (error) {
      logger.error(
        "NotificationService",
        "Failed to request notification permissions",
        error,
      );
      return false;
    }
  }

  // Configure notification behavior and Android channel
  static async configureNotifications() {
    if (this.isConfigured) {
      return;
    }

    try {
      // Set up Android notification channel (required for Android 8.0+)
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "Event Reminders",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#FF231F7C",
          sound: "default",
          enableVibrate: true,
          showBadge: true,
        });
      }

      // Set notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        }),
      });

      // Set up listener for received notifications (actually triggered)
      this.notificationReceivedListener =
        Notifications.addNotificationReceivedListener((notification) => {
          // Parse notification data
          const data = notification.request.content.data as any;
          const title = notification.request.content.title || "";
          const body = notification.request.content.body || "";

          // Try to extract game and event info from the notification data
          const gameId =
            data.gameId || this.extractGameIdFromBody(body) || "unknown";
          const gameName = data.gameName || this.getGameNameFromId(gameId);
          const eventName = data.eventName || "Event";
          const eventType = (data.eventType || "main") as
            | "main"
            | "side"
            | "permanent";
          const notificationType = (data.notificationType || "2hours") as any;
          const isGroup = data.isGroup || false;
          const groupedEventNames = data.groupedEventNames || [];

          // Log triggered notification
          logger.success(
            "NotificationService",
            `Notification TRIGGERED for ${gameName} - ${eventName}`,
          );

          if (this.onNotificationTriggered) {
            this.onNotificationTriggered({
              gameName,
              gameId,
              eventName,
              eventType,
              notificationType,
              timestamp: Date.now(),
              title,
              body,
              isGroup,
              groupedEventNames,
            });
          }
        });

      this.isConfigured = true;
      logger.success(
        "NotificationService",
        "Android channel, handler & notification listener configured",
      );
    } catch (error) {
      logger.error(
        "NotificationService",
        "Failed to configure Android notification channel",
        error,
      );
    }
  }

  // Helper function to extract game ID from notification body
  private static extractGameIdFromBody(body: string): string | null {
    return resolveGameKey(body);
  }

  // Helper function to get game name from game ID
  private static getGameNameFromId(gameId: string): string {
    const key = resolveGameKey(gameId);
    return key ? GAME_CANONICAL_NAMES[key] || "Unknown Game" : "Unknown Game";
  }

  // Schedule a notification for an event (works with both ApiEvent and ProcessedEvent)
  static async scheduleEventNotification(
    event: ApiEvent | ProcessedEvent,
    timeBeforeExpiry: number, // in milliseconds
    notificationType: NotificationTime,
  ) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    const shouldSchedule = await FilterManager.shouldScheduleNotification(
      event,
      notificationType,
    );

    if (!shouldSchedule) {
      return null;
    }

    // Calculate notification time
    const expiryDate = new Date(event.expiry_date);
    const notificationTime = new Date(expiryDate.getTime() - timeBeforeExpiry);
    const now = new Date();

    // Create identifier based on event ID and notification type
    const identifier = `event-${event.event_id}-${notificationType}`;

    // Cancel any existing notification with this ID
    await this.cancelNotification(identifier);

    // Don't schedule if the notification time has already passed
    if (notificationTime <= now) {
      logger.warning(
        "NotificationService",
        `Skipped scheduling '${event.event_name}' (${notificationType}) - trigger time already passed`,
      );
      return null;
    }

    // Create notification content
    const timeText =
      notificationType === "3days"
        ? "3 days"
        : notificationType === "1day"
          ? "1 day"
          : "2 hours";

    // Schedule the notification with a future date trigger
    try {
      // Calculate seconds from now until notification time
      const secondsFromNow = Math.max(
        1,
        Math.round((notificationTime.getTime() - now.getTime()) / 1000),
      );

      // Set up notification content
      const notificationContent: Notifications.NotificationContentInput = {
        title: `${event.event_name} expiring soon`,
        body: `Event in ${event.game_name} will expire in ${timeText}. Don't miss out!`,
        data: {
          eventId: event.event_id,
          gameId: event.game_id,
          gameName: event.game_name,
          eventName: event.event_name,
          eventType: event.event_type,
          notificationType: notificationType,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      };

      // Use proper trigger format - date as timestamp
      const trigger: Notifications.NotificationTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: notificationTime.getTime(),
        channelId: "default",
      };

      // Schedule the notification
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: trigger,
        identifier: identifier,
      });

      logger.success(
        "NotificationService",
        `Scheduled '${event.event_name}' for ${event.game_name} (${notificationType} before expiry)`,
      );

      if (this.onNotificationScheduled) {
        this.onNotificationScheduled({
          id: identifier,
          gameName: event.game_name,
          gameId: event.game_id,
          eventName: event.event_name,
          eventType: event.event_type as any,
          notificationType: notificationType,
          timestamp: notificationTime.getTime(),
          title: notificationContent.title || "",
          body: notificationContent.body || "",
        });
      }

      return identifier;
    } catch (error) {
      logger.error(
        "NotificationService",
        `Failed to schedule '${event.event_name}' notification`,
        error,
      );
      return null;
    }
  }

  // Schedule notifications for a single event (works with both ApiEvent and ProcessedEvent)
  static async scheduleNotificationsForEvent(event: ApiEvent | ProcessedEvent) {
    // Skip if no expire date
    if (!event.expiry_date || !event.event_type) {
      return;
    }

    const allowedTimes = await FilterManager.getNotificationTimesForEvent(
      event.game_name,
      event.event_type as any,
    );

    if (allowedTimes.length === 0) {
      return;
    }

    const timeMapping = {
      "3days": 3 * 24 * 60 * 60 * 1000,
      "1day": 24 * 60 * 60 * 1000,
      "2hours": 2 * 60 * 60 * 1000,
    };

    for (const time of allowedTimes) {
      const timeBeforeExpiry = timeMapping[time];
      await this.scheduleEventNotification(event, timeBeforeExpiry, time);
    }
  }

  // Schedule notifications for all events (works with both ApiEvent and ProcessedEvent)
  static async scheduleNotificationsForEvents(
    events: (ApiEvent | ProcessedEvent)[],
    existingIds: string[] = [],
  ) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    let scheduledCount = 0;
    
    // Grouping structure for normal events
    // Key: `${gameId}-${notificationType}-${notificationTimeMs}`
    const groupedNormalEvents = new Map<string, { 
      gameId: string;
      gameName: string;
      notificationType: NotificationTime;
      notificationTimeMs: number;
      events: (ApiEvent | ProcessedEvent)[];
    }>();

    const timeMapping = {
      "3days": 3 * 24 * 60 * 60 * 1000,
      "1day": 24 * 60 * 60 * 1000,
      "2hours": 2 * 60 * 60 * 1000,
    };

    for (const event of events) {
      // Skip events without expiry dates
      if (!event.expiry_date) {
        continue;
      }

      const expiryDate = new Date(event.expiry_date);

      for (const notificationType of ["3days", "1day", "2hours"] as NotificationTime[]) {
        const shouldSchedule = await FilterManager.shouldScheduleNotification(
          event,
          notificationType,
        );

        if (!shouldSchedule) continue;

        const timeBeforeExpiry = timeMapping[notificationType];
        const notificationTime = new Date(expiryDate.getTime() - timeBeforeExpiry);
        const now = new Date();

        // Don't schedule if the notification time has already passed
        if (notificationTime <= now) continue;

        if (event.event_type === "permanent") {
          // Schedule permanent events individually
          const identifier = `event-${event.event_id}-${notificationType}`;
          await this.cancelNotification(identifier);

          const timeText = notificationType === "3days" ? "3 days" : notificationType === "1day" ? "1 day" : "2 hours";

          const notificationContent: Notifications.NotificationContentInput = {
            title: `${event.event_name} expiring soon`,
            body: `Event in ${event.game_name} will expire in ${timeText}. Don't miss out!`,
            data: {
              eventId: event.event_id,
              gameId: event.game_id,
              gameName: event.game_name,
              eventName: event.event_name,
              eventType: event.event_type,
              notificationType: notificationType,
            },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
          };

          const trigger: Notifications.NotificationTriggerInput = {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: notificationTime.getTime(),
            channelId: "default",
          };

          await Notifications.scheduleNotificationAsync({
            content: notificationContent,
            trigger: trigger,
            identifier: identifier,
          });

          if (this.onNotificationScheduled) {
            this.onNotificationScheduled({
              id: identifier,
              gameName: event.game_name || this.getGameNameFromId(event.game_id),
              gameId: event.game_id,
              eventName: event.event_name || "Event",
              eventType: event.event_type as any,
              notificationType: notificationType,
              timestamp: notificationTime.getTime(),
              title: notificationContent.title || "",
              body: notificationContent.body || "",
            });
          }
          scheduledCount++;
        } else {
          // Group normal events
          const key = `${event.game_id}-${notificationType}-${notificationTime.getTime()}`;
          if (!groupedNormalEvents.has(key)) {
            groupedNormalEvents.set(key, {
              gameId: event.game_id,
              gameName: event.game_name || this.getGameNameFromId(event.game_id),
              notificationType,
              notificationTimeMs: notificationTime.getTime(),
              events: [],
            });
          }
          groupedNormalEvents.get(key)!.events.push(event);
        }
      }
    }

    // Now schedule grouped notifications
    for (const [key, group] of groupedNormalEvents.entries()) {
      const timeText = group.notificationType === "3days" ? "3 days" : group.notificationType === "1day" ? "1 day" : "2 hours";
      
      let title = "";
      let body = "";
      let eventId = "";
      let eventName = "";
      let isGroup = false;
      let groupedEventNames: string[] = [];

      if (group.events.length === 1) {
        const event = group.events[0];
        title = `${event.event_name} expiring soon`;
        body = `Event in ${group.gameName} will expire in ${timeText}. Don't miss out!`;
        eventId = event.event_id;
        eventName = event.event_name || "Event";
      } else {
        isGroup = true;
        title = `${group.events.length} events expiring soon in ${group.gameName}`;
        body = `You have ${group.events.length} events ending in ${timeText}. Don't miss out!`;
        eventId = `group-${group.events.length}`;
        eventName = `${group.events.length} Events`;
        groupedEventNames = group.events.map(e => e.event_name || "Event");
      }

      const identifier = `event-group-${group.gameId}-${group.notificationType}-${group.notificationTimeMs}`;
      await this.cancelNotification(identifier);

      const notificationContent: Notifications.NotificationContentInput = {
        title,
        body,
        data: {
          eventId,
          gameId: group.gameId,
          gameName: group.gameName,
          eventName,
          eventType: group.events[0].event_type, // Assuming same type for the group, or just the first one
          notificationType: group.notificationType,
          isGroup,
          groupedEventNames,
        },
        sound: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      };

      const trigger: Notifications.NotificationTriggerInput = {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: group.notificationTimeMs,
        channelId: "default",
      };

      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: trigger,
        identifier,
      });

      if (this.onNotificationScheduled) {
        this.onNotificationScheduled({
          id: identifier,
          gameName: group.gameName,
          gameId: group.gameId,
          eventName,
          eventType: group.events[0].event_type as any,
          notificationType: group.notificationType,
          timestamp: group.notificationTimeMs,
          title,
          body,
          isGroup,
          groupedEventNames,
        });
      }
      scheduledCount++;
    }

    logger.info(
      "NotificationService",
      `Batch scheduling complete: ${scheduledCount} notifications scheduled`,
    );
  }

  // Cancel a specific notification
  static async cancelNotification(identifier: string) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
    if (this.onNotificationCancelled) {
      this.onNotificationCancelled(identifier);
    }
  }

  // Cancel all event notifications
  static async cancelAllEventNotifications() {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();
    const eventNotifications = scheduledNotifications.filter((notification) =>
      notification.identifier.startsWith("event-"),
    );

    for (const notification of eventNotifications) {
      await Notifications.cancelScheduledNotificationAsync(
        notification.identifier,
      );
      if (this.onNotificationCancelled) {
        this.onNotificationCancelled(notification.identifier);
      }
    }

    logger.info(
      "NotificationService",
      `Cancelled all event notifications (${eventNotifications.length} total)`,
    );
  }

  // Get count of currently scheduled notifications (for debugging)
  static async getScheduledNotificationCount(): Promise<number> {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();
    const eventNotifications = scheduledNotifications.filter((notification) =>
      notification.identifier.startsWith("event-"),
    );

    return eventNotifications.length;
  }

  // Get detailed info about all scheduled notifications (for debugging)
  static async getScheduledNotificationsDetails(): Promise<{
    total: number;
    eventCount: number;
    testCount: number;
    otherCount: number;
    details: Array<{
      id: string;
      title: string;
      body: string;
      triggerDate?: string;
      triggerType?: string;
      eventId?: string;
      notificationType?: string;
      timeUntilTrigger?: string;
    }>;
  }> {
    try {
      const allScheduled =
        await Notifications.getAllScheduledNotificationsAsync();
      const now = new Date();

      const details = allScheduled.map((notification) => {
        const content = notification.content;
        const trigger = notification.trigger as any;

        // Parse event ID and notification type from identifier
        let eventId: string | undefined;
        let notificationType: string | undefined;

        const idMatch = notification.identifier.match(
          /event-(.+)-(3days|1day|2hours)/,
        );
        if (idMatch) {
          eventId = idMatch[1];
          notificationType = idMatch[2];
        }

        // Get trigger information
        let triggerDate: string | undefined;
        let triggerType: string | undefined;
        let timeUntilTrigger: string | undefined;

        if (trigger) {
          triggerType = trigger.type || "unknown";

          if (trigger.date) {
            const triggerDateTime = new Date(trigger.date);
            triggerDate = triggerDateTime.toLocaleString();

            // Calculate time until trigger
            const msUntil = triggerDateTime.getTime() - now.getTime();
            const hoursUntil = Math.floor(msUntil / (1000 * 60 * 60));
            const minutesUntil = Math.floor(
              (msUntil % (1000 * 60 * 60)) / (1000 * 60),
            );

            if (msUntil < 0) {
              timeUntilTrigger = "OVERDUE (should have triggered)";
            } else if (hoursUntil > 24) {
              const daysUntil = Math.floor(hoursUntil / 24);
              timeUntilTrigger = `${daysUntil}d ${hoursUntil % 24}h`;
            } else {
              timeUntilTrigger = `${hoursUntil}h ${minutesUntil}m`;
            }
          } else if (trigger.seconds) {
            timeUntilTrigger = `${trigger.seconds} seconds (repeating: ${
              trigger.repeats || false
            })`;
          }
        }

        return {
          id: notification.identifier,
          title: content.title || "No title",
          body: content.body || "No body",
          triggerDate,
          triggerType,
          eventId,
          notificationType,
          timeUntilTrigger,
        };
      });

      const eventCount = allScheduled.filter((n) =>
        n.identifier.startsWith("event-"),
      ).length;
      const testCount = allScheduled.filter((n) =>
        n.identifier.includes("test"),
      ).length;
      const otherCount = allScheduled.length - eventCount - testCount;

      return {
        total: allScheduled.length,
        eventCount,
        testCount,
        otherCount,
        details,
      };
    } catch (error) {
      logger.error(
        "NotificationService",
        "Failed to get scheduled details",
        error,
      );
      return {
        total: 0,
        eventCount: 0,
        testCount: 0,
        otherCount: 0,
        details: [],
      };
    }
  }

  // Test notification - useful for debugging
  static async sendTestNotification() {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      await this.configureNotifications();

      // Cancel any existing test notifications first
      const allScheduled =
        await Notifications.getAllScheduledNotificationsAsync();
      const testNotifs = allScheduled.filter((n) =>
        n.identifier.includes("test"),
      );
      for (const notif of testNotifs) {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }

      // Use null trigger to send immediately (non-repeating)
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Test Notification ✅",
          body: "Your notification system is working correctly!",
          data: { test: true },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null, // Send immediately, no repeat
      });

      logger.success("NotificationService", "Sent immediate test notification");
      return true;
    } catch (error) {
      logger.error(
        "NotificationService",
        "Failed to send test notification",
        error,
      );
      return false;
    }
  }

  // Cancel all notifications (including test notifications)
  static async cancelAllNotifications() {
    try {
      const allScheduled =
        await Notifications.getAllScheduledNotificationsAsync();
      let cancelledCount = 0;

      for (const notification of allScheduled) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier,
        );
        cancelledCount++;
      }

      logger.info(
        "NotificationService",
        `Cancelled all scheduled notifications (${cancelledCount} total)`,
      );
      return cancelledCount;
    } catch (error) {
      logger.error(
        "NotificationService",
        "Failed to cancel all notifications",
        error,
      );
      return 0;
    }
  }

  // Test scheduled notification (5 seconds in future) - for testing the scheduling system
  static async sendTestScheduledNotification() {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        return false;
      }

      await this.configureNotifications();

      // Cancel any existing test scheduled notifications
      await Notifications.cancelScheduledNotificationAsync(
        "test-scheduled-notification",
      );

      // Schedule for 5 seconds in the future
      const triggerTime = new Date(Date.now() + 5000);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "⏰ Scheduled Test Notification",
          body: `This notification was scheduled for ${triggerTime.toLocaleTimeString()}. Scheduling works!`,
          data: { test: true, scheduled: true },
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerTime.getTime(),
          channelId: "default",
        },
        identifier: "test-scheduled-notification",
      });

      // Verify it was scheduled
      const allScheduled =
        await Notifications.getAllScheduledNotificationsAsync();
      const wasScheduled = allScheduled.find(
        (n) => n.identifier === "test-scheduled-notification",
      );

      logger.success(
        "NotificationService",
        `Scheduled test notification for ${triggerTime.toLocaleTimeString()} ${
          wasScheduled ? "(verified in queue)" : "(⚠️ not verified)"
        }`,
      );
      return true;
    } catch (error) {
      logger.error(
        "NotificationService",
        "Failed to schedule test notification",
        error,
      );
      return false;
    }
  }

  // Comprehensive debug check
  static async debugNotificationSystem() {
    logger.debug("NotificationService", "Running system diagnostics...");

    try {
      const { status } = await Notifications.getPermissionsAsync();

      let channelExists = false;
      if (Platform.OS === "android") {
        const channel =
          await Notifications.getNotificationChannelAsync("default");
        channelExists = !!channel;
      }

      const allScheduled =
        await Notifications.getAllScheduledNotificationsAsync();
      const eventNotifs = allScheduled.filter((n) =>
        n.identifier.startsWith("event-"),
      );

      const testResult = await this.sendTestScheduledNotification();

      const result = {
        isDevice: Device.isDevice,
        platform: Platform.OS,
        permissionStatus: status,
        isConfigured: this.isConfigured,
        channelExists,
        totalScheduled: allScheduled.length,
        eventNotifications: eventNotifs.length,
        testScheduleSuccess: testResult,
      };

      logger.debug(
        "NotificationService",
        `Diagnostics complete: Permission=${status}, Total=${allScheduled.length}, Events=${eventNotifs.length}, Device=${Device.isDevice}`,
      );
      return result;
    } catch (error) {
      logger.error("NotificationService", "Diagnostics failed", error);
      return null;
    }
  }
}

export default NotificationService;
