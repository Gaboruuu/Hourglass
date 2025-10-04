import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { ProcessedEvent } from "@/data/permanentEvents/PermanentEventsManager";

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

  // Schedule a notification for an event
  static async scheduleEventNotification(
    event: ProcessedEvent,
    timeBeforeExpiry: number, // in milliseconds
    notificationType: "day" | "hours"
  ) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return null;

    // Calculate notification time
    const expiryDate = new Date(event.expire_date);
    const notificationTime = new Date(expiryDate.getTime() - timeBeforeExpiry);
    const now = new Date();

    // Don't schedule if the notification time has already passed
    if (notificationTime <= now) {
      console.log(
        `Skipping notification for ${event.event_name}, would trigger in the past. ` +
          `Expiry: ${expiryDate.toLocaleString()}, Now: ${now.toLocaleString()}`
      );
      return null;
    }

    // Create notification content
    const timeText = notificationType === "day" ? "1 day" : "2 hours";

    // Create identifier based on event ID and notification type
    const identifier = `event-${event.id}-${notificationType}`;

    // Calculate time until notification triggers
    const msUntilNotification = notificationTime.getTime() - now.getTime();
    const hoursUntilNotification =
      Math.round((msUntilNotification / (1000 * 60 * 60)) * 10) / 10;

    console.log(
      `Scheduling ${timeText} notification for ${event.event_name}. ` +
        `Will trigger in approximately ${hoursUntilNotification} hours`
    );

    // Cancel any existing notification with this ID
    await this.cancelNotification(identifier);

    // Schedule the notification
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${event.event_name} expiring soon`,
        body: `Event in ${event.game_name} will expire in ${timeText}. Don't miss out!`,
        data: { eventId: event.id },
      },
      trigger: {
        channelId: "event-reminders", // For Android
        date: notificationTime,
      },
      identifier,
    });

    console.log(
      `Notification scheduled for ${
        event.event_name
      } at ${notificationTime.toLocaleString()}`
    );
    return identifier;
  }

  // Schedule notifications for a single event
  static async scheduleNotificationsForEvent(event: ProcessedEvent) {
    // Skip if no expire date
    if (!event.expire_date) return;

    console.log(`Scheduling all notifications for event: ${event.event_name}`);

    // Schedule 1-day notification
    const dayInMs = 24 * 60 * 60 * 1000; // 1 day in milliseconds
    await this.scheduleEventNotification(event, dayInMs, "day");

    // Schedule 2-hour notification
    const twoHoursInMs = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
    await this.scheduleEventNotification(event, twoHoursInMs, "hours");
  }

  // Schedule notifications for all events
  static async scheduleNotificationsForEvents(
    events: ProcessedEvent[],
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
      if (!event.expire_date) {
        continue;
      }

      // Calculate notification IDs for this event
      const dayIdentifier = `event-${event.id}-day`;
      const hoursIdentifier = `event-${event.id}-hours`;

      // Check if notifications are already scheduled for this event
      const dayAlreadyScheduled = notificationIds.includes(dayIdentifier);
      const hoursAlreadyScheduled = notificationIds.includes(hoursIdentifier);

      // If both notifications already exist, skip this event
      if (dayAlreadyScheduled && hoursAlreadyScheduled) {
        console.log(
          `Notifications already scheduled for event: ${event.event_name}`
        );
        skippedCount++;
        continue;
      }

      // Schedule notifications for this event
      console.log(`Scheduling notifications for event: ${event.event_name}`);

      // Calculate notification times
      const expiryDate = new Date(event.expire_date);
      const dayInMs = 24 * 60 * 60 * 1000; // 1 day in milliseconds
      const twoHoursInMs = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

      // Schedule day notification if needed
      if (!dayAlreadyScheduled) {
        await this.scheduleEventNotification(event, dayInMs, "day");
      }

      // Schedule hours notification if needed
      if (!hoursAlreadyScheduled) {
        await this.scheduleEventNotification(event, twoHoursInMs, "hours");
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
  }
}

export default NotificationService;
