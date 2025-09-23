import React, { useState, useEffect } from "react";
import { View, FlatList, Text, StyleSheet } from "react-native";
import PermanentEventCard from "../components/PermanentEventCard";
import { permanentEventsManager } from "../data/permanentEvents/PermanentEventsManager";
import SeparatorWithText from "../components/Separator";
import { useTheme } from "@/context/ThemeContext";

interface PermanentEvent {
  id: string;
  event_name: string;
  game_name: string;
  background: string;
  importance: string;
  daily_login: boolean;
  start_date: string;
  expire_date: string;
  description: string;
  rewards?: string[];
  max_completions?: number;
  isPermanent: boolean;
  reset_type: string;
  duration_days?: number;
  reset_info: {
    type: string;
    day?: number;
    time?: string;
  };
}

export default function PermanentEventsScreen() {
  const [events, setEvents] = useState<PermanentEvent[]>([]);
  const [gamesList, setGamesList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();

  useEffect(() => {
    fetchPermanentEvents();
    
    // Update every minute instead of every second
    const interval = setInterval(() => {
      fetchPermanentEvents();
    }, 60000); // 60 seconds = 1 minute

    return () => clearInterval(interval);
  }, []);

  // Extract games whenever events change
  useEffect(() => {
    if (events.length > 0) {
      fetchGames();
    }
  }, [events]);

  const fetchPermanentEvents = () => {
    try {
      console.log("Fetching permanent events...");
      const permanentEvents = permanentEventsManager.getPermanentEventsAsEvents();
      console.log("Permanent events:", permanentEvents);
      setEvents(permanentEvents as PermanentEvent[]);
    } catch (error) {
      console.error("Error fetching permanent events:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGames = () => {
    try {
      console.log("Fetching games from events...");
      const uniqueGames: string[] = [];
      for (const event of events) {
        if (event.game_name && !uniqueGames.includes(event.game_name)) {
          uniqueGames.push(event.game_name);
        }
      }
      console.log("Games found:", uniqueGames);
      setGamesList(uniqueGames);
    } catch (error) {
      console.error("Error fetching games:", error);
    }
  }

  const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
  },
  list: {
    backgroundColor: colors.background,
    width: "100%",
    padding: 20
  },
  noEventsText: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
  },
});


  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading permanent events...</Text>
      </View>
    );
  }

  

  return (
    <View style={styles.container}>
    <FlatList
      data={gamesList}
      keyExtractor={(game) => game}
      contentContainerStyle={styles.list}
      renderItem={({ item: game }) => (
      <View style={{ marginBottom: 10, backgroundColor: colors.background }}>
        <SeparatorWithText text={game} />
        <FlatList
        data={events.filter(event => event.game_name === game)}
        keyExtractor={(event) => event.id}
        renderItem={({ item: event }) => (
          <View style={{ marginVertical: 8, alignItems: "center" }}>
          <PermanentEventCard event={event} />
          </View>
        )}
        scrollEnabled={false}
        />
      </View>
      )}
      ListEmptyComponent={
      <Text style={styles.noEventsText}>No permanent events found.</Text>
      }
    />
    </View>
  );

  
}



