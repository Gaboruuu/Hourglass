import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import {
  ProcessedEvent,
  NotificationTime,
  ApiEvent,
  AnyEvent,
} from "@/data/EventInteface";
import { FilterManager } from "./FilterManager";

export class NotificationService {
  // Request permission to send notifications
  static async requestPermissions() {
    if (Device.isDevice) {
      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("Failed to get push token for notification!");
        return false;
      }

      return true;
    }

    console.log("Must use physical device for notifications");
    return false;
  }

  // Configure notification behavior
  static configureNotifications() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }

  // Schedule a notification for an event (works with both ApiEvent and ProcessedEvent)
  static async scheduleEventNotification(
    event: ApiEvent | ProcessedEvent,
    timeBeforeExpiry: number, // in milliseconds
    notificationType: NotificationTime
  ) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    const shouldSchedule = await FilterManager.shouldScheduleNotification(
      event,
      notificationType
    );

    if (!shouldSchedule) {
      console.log(
        `Skipping ${notificationType} notification for ${event.event_name} due to filters.`
      );
      return null;
    }

    // Calculate notification time
    const expiryDate = new Date(event.expiry_date);
    const notificationTime = new Date(expiryDate.getTime() - timeBeforeExpiry);
    const now = new Date();

    // Don't schedule if the notification time has already passed
    if (notificationTime <= now) {
      console.log(
        `Skipping notification for ${event.event_name}, would trigger in the past. ` +
          `Expiry: ${expiryDate.toLocaleString()}, Now: ${now.toLocaleString()}, ` +
          `Notification would trigger: ${notificationTime.toLocaleString()}`
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

    // Create identifier based on event ID and notification type
    const identifier = `event-${event.event_id}-${notificationType}`;

    // Calculate time until notification triggers
    const msUntilNotification = notificationTime.getTime() - now.getTime();
    const hoursUntilNotification =
      Math.round((msUntilNotification / (1000 * 60 * 60)) * 10) / 10;

    console.log(
      `Scheduling ${timeText} notification for ${event.event_name}. ` +
        `Will trigger in approximately ${hoursUntilNotification} hours ` +
        `(${notificationTime.toLocaleString()})`
    );

    // Cancel any existing notification with this ID
    await this.cancelNotification(identifier);

    // Schedule the notification with a future date trigger
    // Make sure the notification is scheduled for future, not instant delivery
    try {
      // Calculate seconds from now until notification time
      const secondsFromNow = Math.round(
        (notificationTime.getTime() - now.getTime()) / 1000
      );

      // Set up notification content
      const notificationContent = {
        title: `${event.event_name} expiring soon`,
        body: `Event in ${event.game_name} will expire in ${timeText}. Don't miss out!`,
        data: { eventId: event.event_id },
      };

      // Schedule using the standard structure
      await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: notificationTime,
        identifier,
      } as any); // Use 'as any' to bypass TypeScript issues

      console.log(
        `Successfully scheduled notification for ${
          event.event_name
        } to trigger at ${notificationTime.toLocaleString()} (${secondsFromNow} seconds from now)`
      );
    } catch (error) {
      console.error(
        `Failed to schedule notification for ${event.event_name}:`,
        error
      );
      return null;
    }

    console.log(
      `Notification scheduled for ${
        event.event_name
      } at ${notificationTime.toLocaleString()}`
    );
    return identifier;
  }

  // Schedule notifications for a single event (works with both ApiEvent and ProcessedEvent)
  static async scheduleNotificationsForEvent(event: ApiEvent | ProcessedEvent) {
    // Skip if no expire date
    if (!event.expiry_date || !event.event_type) return;

    console.log(`Scheduling all notifications for event: ${event.event_name}`);

    const allowedTimes = await FilterManager.getNotificationTimesForEvent(
      event.game_name,
      event.event_type as any
    );

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
    existingIds: string[] = []
  ) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    // First, if we weren't given any existing IDs, get them from the system
    let notificationIds = existingIds;
    if (notificationIds.length === 0) {
      const scheduledNotifications =
        await Notifications.getAllScheduledNotificationsAsync();
      notificationIds = scheduledNotifications.map((n) => n.identifier);
      console.log(
        `Found ${notificationIds.length} existing scheduled notifications`
      );
    }

    // Schedule notifications for events
    console.log(`Processing notifications for ${events.length} events`);
    let scheduledCount = 0;
    let skippedCount = 0;

    for (const event of events) {
      // Skip events without expiry dates
      if (!event.expiry_date) {
        continue;
      }

      // Calculate notification IDs for this event
      const threeDaysIdentifier = `event-${event.event_id}-3days`;
      const dayIdentifier = `event-${event.event_id}-1day`;
      const hoursIdentifier = `event-${event.event_id}-2hours`;

      // Check if notifications are already scheduled for this event
      const threeDaysAlreadyScheduled =
        notificationIds.includes(threeDaysIdentifier);
      const dayAlreadyScheduled = notificationIds.includes(dayIdentifier);
      const hoursAlreadyScheduled = notificationIds.includes(hoursIdentifier);

      // If both notifications already exist, skip this event
      if (
        dayAlreadyScheduled &&
        hoursAlreadyScheduled &&
        threeDaysAlreadyScheduled
      ) {
        console.log(
          `Notifications already scheduled for event: ${event.event_name}`
        );
        skippedCount++;
        continue;
      }

      // Schedule notifications for this event
      console.log(`Scheduling notifications for event: ${event.event_name}`);

      // Calculate notification times
      const expiryDate = new Date(event.expiry_date);
      const threeDaysInMs = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
      const dayInMs = 24 * 60 * 60 * 1000; // 1 day in milliseconds
      const twoHoursInMs = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

      // Schedule 3-day notification if needed
      if (!threeDaysAlreadyScheduled) {
        await this.scheduleEventNotification(event, threeDaysInMs, "3days");
      }
      // Schedule day notification if needed
      if (!dayAlreadyScheduled) {
        await this.scheduleEventNotification(event, dayInMs, "1day");
      }

      // Schedule hours notification if needed
      if (!hoursAlreadyScheduled) {
        await this.scheduleEventNotification(event, twoHoursInMs, "2hours");
      }

      scheduledCount++;
    }

    console.log(
      `Notification scheduling complete. ${scheduledCount} events scheduled, ${skippedCount} events skipped (already scheduled).`
    );
  }

  // Cancel a specific notification
  static async cancelNotification(identifier: string) {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  }

  // Cancel all event notifications
  static async cancelAllEventNotifications() {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();
    const eventNotifications = scheduledNotifications.filter((notification) =>
      notification.identifier.startsWith("event-")
    );

    for (const notification of eventNotifications) {
      await Notifications.cancelScheduledNotificationAsync(
        notification.identifier
      );
    }

    console.log(`Canceled ${eventNotifications.length} event notifications`);
  }

  // Get count of currently scheduled notifications (for debugging)
  static async getScheduledNotificationCount(): Promise<number> {
    const scheduledNotifications =
      await Notifications.getAllScheduledNotificationsAsync();
    const eventNotifications = scheduledNotifications.filter((notification) =>
      notification.identifier.startsWith("event-")
    );

    console.log(
      `Currently scheduled notifications: ${eventNotifications.length}`
    );
    return eventNotifications.length;
  }
}

export default NotificationService;
