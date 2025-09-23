import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  Text,
  StyleSheet,
} from "react-native";
import EventCard from "../../../src/components/events/EventCard";
import SeparatorWithText from "@/components/Separator";
import { useTheme } from "@/context/ThemeContext";

interface Event {
  id: string;
  game_id: string;
  game_title: string;
  start_date: string;
  expire_date: string;
  daily_login: string;
  importance: string;
  remaining: string;
}

const AllEventsScreen = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [times, setTimes] = useState<string[]>([]);
  const [rawEvents, setRawEvents] = useState<Event[]>([]);
  const { colors } = useTheme();

  useEffect(() => {
    fetchEvents();
    // Update every minute instead of every second
    const interval = setInterval(() => {
      fetchEvents();
    }, 60000); // 60 seconds = 1 minute
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (rawEvents.length > 0) {
      calculateAndSetTimes();
    }
  }, [rawEvents]);

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
    const timeCategories: { [key: string]: Event[] } = {};

    // First, categorize events and add remaining property
    const eventsWithRemaining = rawEvents.map((event) => {
      const startDate = event.start_date ? new Date(event.start_date) : null;
      const eventDate = new Date(event.expire_date);
      const timeDiff = eventDate.getTime() - now.getTime();
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

      const eventWithRemaining = { ...event, remaining: remainingCategory };

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
      color: colors.text,
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
              keyExtractor={(event) => event.id}
              renderItem={({ item: event }) => (
                <View style={{ marginVertical: 8 }}>
                  <EventCard event={event} />
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
