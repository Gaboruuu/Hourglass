import React, { useState, useEffect } from "react";
import { View, FlatList, ActivityIndicator, Text, StyleSheet} from "react-native";
import EventCard from "../components/EventCard";
import SeparatorWithText from "@/components/Separator";

interface Event {
  id: string;
  game_id: string;
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
      const response = await fetch("https://hourglass-h6zo.onrender.com/api/events");
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
    const eventsWithRemaining = rawEvents.map(event => {
      const eventDate = new Date(event.expire_date);
      const timeDiff = eventDate.getTime() - now.getTime();
      const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

      let remainingCategory: string;
      if (daysDiff < 0) {
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
    ];
    
    const availableCategories = orderedCategories.filter(category => 
      timeCategories[category] && timeCategories[category].length > 0
    );
    
    setTimes(availableCategories);
  };


  if (loading) return <ActivityIndicator size="large" color="#0000ff" />;

  return (
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
                <EventCard
                  event={event}
                />
              </View>
            )}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
});

export default AllEventsScreen;
