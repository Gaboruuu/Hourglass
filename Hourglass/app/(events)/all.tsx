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
import { logger } from "@/utils/logger";
import { useEventNotifications } from "@/hooks/useEventNotifications";

const AllEventsScreen = () => {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [times, setTimes] = useState<string[]>([]);
  const [rawEvents, setRawEvents] = useState<ApiEvent[]>([]);
  const { colors } = useTheme();
  const regionContext = useRegionContext();

  const { notificationsEnabled } = useEventNotifications({
    events: rawEvents,
    loading,
    screenName: "AllScreen",
    eventType: "api",
  });

  // Fetch events on mount and when region changes
  useEffect(() => {
    fetchEvents();
    // Update every minute instead of every second
    const interval = setInterval(() => {
      fetchEvents();
    }, 60000); // 60 seconds = 1 minute
    return () => clearInterval(interval);
  }, [regionContext.region]); // Re-fetch when region changes

  // Recalculate times every hour for category accuracy
  useEffect(() => {
    // Calculate immediately when events or region change
    if (rawEvents.length > 0) {
      calculateAndSetTimes();
    }
  }, [rawEvents, regionContext.region]);

  const fetchEvents = async () => {
    try {
      // Update to use the new API endpoint
      const response = await fetch(
        "https://hourglass-h6zo.onrender.com/api/events"
      );
      const data = await response.json();
      setRawEvents(data);
    } catch (error) {
      logger.error("AllScreen", "Failed to fetch events from database", error);
    } finally {
      setLoading(false);
      logger.info("AllScreen", "Finished fetching events from database", {
        rawEventsLength: rawEvents.length,
      });
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
        keyExtractor={(time, index) => `time-${time}-${index}`}
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
