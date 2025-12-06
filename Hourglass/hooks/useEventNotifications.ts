import { AnyEvent, ApiEvent, ProcessedEvent } from "@/data/EventInteface";
import { useCallback, useEffect, useState } from "react";
import { useRegionContext } from "../context/RegionContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "@/utils/logger";
import { NotificationService } from "@/data/NotificationManager";

interface UseEventNotificationsOptions {
  events: ApiEvent[] | ProcessedEvent[];
  eventType?: "api" | "permanent";
  loading: boolean;
  screenName: string;
}

export const useEventNotifications = ({
  events,
  loading,
  screenName,
  eventType,
}: UseEventNotificationsOptions) => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const regionContext = useRegionContext();

  const loadNotificationSetting = useCallback(async () => {
    try {
      const enabled = await AsyncStorage.getItem("notificationsEnabled");
      setNotificationsEnabled(enabled === "true");
      logger.info(
        screenName,
        `Notification setting loaded: ${
          enabled === "true" ? "enabled" : "disabled"
        }`
      );
    } catch (error) {
      logger.error(
        screenName,
        "Failed to load notification setting from AsyncStorage",
        error
      );
    }
  }, [screenName]);

  const scheduleEventNotifications = useCallback(async () => {
    if (!notificationsEnabled || events.length === 0 || loading) {
      return;
    }

    try {
      await NotificationService.scheduleNotificationsForEvents(events);
      logger.info(
        screenName,
        `Scheduled notifications for ${events.length} ${
          eventType ?? ""
        } events from database`
      );
    } catch (error) {
      logger.error(
        screenName,
        `Failed to schedule ${events.length} ${eventType ?? ""} events`,
        error
      );
    }
  }, [notificationsEnabled, events, loading, screenName, eventType]);

  const rescheduleNotificationsAfterRegionChange = useCallback(async () => {
    if (!notificationsEnabled || events.length === 0) {
      return;
    }

    try {
      // Cancel existing notifications for API events
      for (const event of events) {
        await NotificationService.cancelNotification(
          `event-${event.event_id}-3days`
        );
        await NotificationService.cancelNotification(
          `event-${event.event_id}-1day`
        );
        await NotificationService.cancelNotification(
          `event-${event.event_id}-2hours`
        );
      }

      // Reschedule with new region timing
      await NotificationService.scheduleNotificationsForEvents(events);
      logger.info(
        screenName,
        `Rescheduled ${events.length} ${
          eventType ?? ""
        } events for new region: ${regionContext.region}`
      );
    } catch (error) {
      logger.error(
        screenName,
        `Failed to reschedule ${events.length} ${
          eventType ?? ""
        } events after region change to ${regionContext.region}`,
        error
      );
    }
  }, [
    notificationsEnabled,
    events,
    screenName,
    regionContext.region,
    eventType,
  ]);

  useEffect(() => {
    loadNotificationSetting();
  }, [loadNotificationSetting]);

  useEffect(() => {
    scheduleEventNotifications();
  }, [scheduleEventNotifications]);

  useEffect(() => {
    if (!loading && events.length > 0) {
      rescheduleNotificationsAfterRegionChange();
    }
  }, [rescheduleNotificationsAfterRegionChange, loading, regionContext.region]);

  return {
    notificationsEnabled,
    setNotificationsEnabled,
    loadNotificationSetting,
  };
};
