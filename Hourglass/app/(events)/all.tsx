import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  StyleSheet,
} from "react-native";
import ApiEventCard from "@/components/events/ApiEventCard";
import SeparatorWithText from "@/components/ui/Separator";
import { useTheme } from "@/context/ThemeContext";
import { useRegionContext } from "@/context/RegionContext";
import { ApiEvent } from "@/data/EventInteface";
import { NotificationService } from "@/data/NotificationManager";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AllEventsScreen = () => {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [times, setTimes] = useState<string[]>([]);
  const [rawEvents, setRawEvents] = useState<ApiEvent[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const { colors } = useTheme();
  const regionContext = useRegionContext();

  useEffect(() => {
    loadNotificationSetting();
    fetchEvents();
    // Update every minute instead of every second
    const interval = setInterval(() => {
      fetchEvents();
    }, 60000); // 60 seconds = 1 minute
    return () => clearInterval(interval);
  }, [regionContext.region]); // Re-fetch when region changes

  useEffect(() => {
    if (rawEvents.length > 0) {
      calculateAndSetTimes();

      // Schedule notifications for API events if enabled
      if (notificationsEnabled && !loading) {
        console.log("Scheduling notifications for API events...");
        scheduleApiEventNotifications();
      }
    }
  }, [rawEvents, regionContext.region, notificationsEnabled]);

  // Handle region changes specifically for notification rescheduling
  useEffect(() => {
    if (!loading && rawEvents.length > 0) {
      rescheduleNotificationsAfterRegionChange();
    }
  }, [regionContext.region]);

  const loadNotificationSetting = async () => {
    try {
      const enabled = await AsyncStorage.getItem("notificationsEnabled");
      setNotificationsEnabled(enabled === "true");
    } catch (error) {
      console.error("Error loading notification setting:", error);
    }
  };

  const scheduleApiEventNotifications = async () => {
    try {
      // Schedule notifications for all API events
      await NotificationService.scheduleNotificationsForEvents(rawEvents);
      console.log(`Scheduled notifications for ${rawEvents.length} API events`);
    } catch (error) {
      console.error("Error scheduling API event notifications:", error);
    }
  };

  const rescheduleNotificationsAfterRegionChange = async () => {
    if (notificationsEnabled && rawEvents.length > 0) {
      try {
        console.log("Region changed, rescheduling API event notifications...");

        // Cancel existing notifications for API events
        for (const event of rawEvents) {
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
        await NotificationService.scheduleNotificationsForEvents(rawEvents);

        console.log("API event notifications rescheduled for new region");
      } catch (error) {
        console.error(
          "Error rescheduling API event notifications after region change:",
          error
        );
      }
    }
  };

  const fetchEvents = async () => {
    try {
      // Update to use the new API endpoint
      const response = await fetch(
        "https://hourglass-h6zo.onrender.com/api/events"
      );
      const data = await response.json();
      console.log("Fetched events from the database:", data);
      setRawEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAndSetTimes = () => {
    const now = new Date();
    const timeCategories: { [key: string]: ApiEvent[] } = {};

    // First, categorize events and add remaining property
    const eventsWithRemaining = rawEvents.map((event) => {
      // Calculate the reset time based on the event's start date and region settings (4 AM server time)
      const startDate = event.start_date
        ? regionContext.getResetTimeForDate(new Date(event.start_date))
        : null;

      // Calculate the reset time based on the event's expiry and region settings
      const originalEventDate = new Date(event.expiry_date);

      // Get the reset time for this date using the region context
      const eventResetDate =
        regionContext.getResetTimeForDate(originalEventDate);

      // Debug logging to verify region changes are affecting reset times
      console.log(
        `Region: ${regionContext.region}, Event ID: ${
          event.event_id
        }, Original date: ${originalEventDate.toISOString()}, Reset date: ${eventResetDate.toISOString()}`
      );

      // Use the reset time of the configured region instead of the raw expire_date
      const timeDiff = eventResetDate.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      let remainingCategory: string;
      // Future event: start date exists and is in the future
      if (startDate && startDate.getTime() > now.getTime()) {
        remainingCategory = "Future Events";
      } else if (daysDiff < 0) {
        remainingCategory = "Expired";
      } else if (daysDiff < 1) {
        remainingCategory = "Expire today";
      } else if (daysDiff < 3) {
        remainingCategory = "Expire in less than 3 days";
      } else if (daysDiff < 7) {
        remainingCategory = "Expire in less than a week";
      } else if (daysDiff < 14) {
        remainingCategory = "Expire in 1-2 weeks";
      } else if (daysDiff < 30) {
        remainingCategory = "Expire in 2-4 weeks";
      } else {
        remainingCategory = "Expire in more than a month";
      }

      // Include the reset date in the event object so it can be used by the EventCard component
      const eventWithRemaining = {
        ...event,
        remaining: remainingCategory,
        reset_date: eventResetDate.toISOString(),
        reset_start_date: startDate?.toISOString(),
      };

      if (!timeCategories[remainingCategory]) {
        timeCategories[remainingCategory] = [];
      }
      timeCategories[remainingCategory].push(eventWithRemaining);

      return eventWithRemaining;
    });

    // Update events with remaining property
    setEvents(eventsWithRemaining);

    // Set the time categories in order of urgency
    const orderedCategories = [
      "Expire today",
      "Expire in less than 3 days",
      "Expire in less than a week",
      "Expire in 1-2 weeks",
      "Expire in 2-4 weeks",
      "Expire in more than a month",
      "Future Events",
    ];

    const availableCategories = orderedCategories.filter(
      (category) =>
        timeCategories[category] && timeCategories[category].length > 0
    );

    setTimes(availableCategories);
  };

  if (loading) return <ActivityIndicator size="large" color="#0000ff" />;

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 20,
      color: colors.textPrimary,
    },
  });

  return (
    <View style={styles.container}>
      <FlatList
        data={times}
        keyExtractor={(time) => time}
        renderItem={({ item: time }) => (
          <View style={{ marginBottom: 10, marginHorizontal: 20 }}>
            <SeparatorWithText text={time} />
            <FlatList
              data={events.filter((event) => event.remaining === time)}
              keyExtractor={(event) => event.event_id}
              renderItem={({ item: event }) => (
                <View style={{ marginVertical: 8 }}>
                  <ApiEventCard event={event} />
                </View>
              )}
            />
          </View>
        )}
      />
    </View>
  );
};

export default AllEventsScreen;
