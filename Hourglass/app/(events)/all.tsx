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
import { useEvents } from "@/context/EventsContext";

const AllEventsScreen = () => {
  const [events, setEvents] = useState<ApiEvent[]>([]);
  const [times, setTimes] = useState<string[]>([]);
  const { colors } = useTheme();
  const regionContext = useRegionContext();
  const { apiEvents, isLoading } = useEvents();

  useEffect(() => {
    if (apiEvents.length > 0) {
      calculateAndSetTimes();
    }

    const interval = setInterval(() => {
      if (apiEvents.length > 0) {
        calculateAndSetTimes();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [apiEvents, regionContext.region]);

  const calculateAndSetTimes = () => {
    const now = new Date();
    const timeCategories: { [key: string]: ApiEvent[] } = {};

    // First, categorize events and add remaining property
    const eventsWithRemaining = apiEvents.map((event) => {
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
        timeCategories[category] && timeCategories[category].length > 0,
    );

    setTimes(availableCategories);

    logger.info(
      "AllEventsScreen",
      `Categorized ${apiEvents.length} events into ${availableCategories.length} categories`,
    );
  };

  if (isLoading) return <ActivityIndicator size="large" color="#0000ff" />;

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
              data={events
                .filter((event) => event.remaining === time)
                .sort((a, b) => {
                  // For future events, sort by start date
                  if (time === "Future Events") {
                    return (
                      new Date(a.start_date).getTime() -
                      new Date(b.start_date).getTime()
                    );
                  }
                  // For other events, sort by expiry date (earliest first)
                  return (
                    new Date(a.expiry_date).getTime() -
                    new Date(b.expiry_date).getTime()
                  );
                })}
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
