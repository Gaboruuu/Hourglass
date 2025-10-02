import React, { useState, useEffect } from "react";
import { View, FlatList, Text, StyleSheet } from "react-native";
import PermanentEventCard from "@/components/events/PermanentEventCard";
import SeparatorWithText from "@/components/ui/Separator";
import { useTheme } from "@/context/ThemeContext";
import { useRegionContext } from "@/context/RegionContext";
import permanentEventsManager, {
  ProcessedEvent,
} from "@/data/permanentEvents/PermanentEventsManager";

// We'll use the ProcessedEvent interface from PermanentEventsManager
// but extend it to match any additional fields needed by PermanentEventCard
interface PermanentEventDisplay extends ProcessedEvent {
  isPermanent: boolean; // Add this field which seems to be used in the card
  reset_info?: {
    type: string;
    day?: number;
    time?: string;
  };
  rewards?: string[];
  max_completions?: number;
}

export default function PermanentEventsScreen() {
  const [events, setEvents] = useState<PermanentEventDisplay[]>([]);
  const [gamesList, setGamesList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const regionContext = useRegionContext();

  // Sync with region context when component mounts or region changes
  useEffect(() => {
    // Sync the permanent events manager with the current region
    permanentEventsManager.syncWithRegionContext(regionContext);
    fetchPermanentEvents();
  }, [regionContext.region]); // Re-run when region changes

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
      // Get all events sorted by expiration date
      const permanentEvents = permanentEventsManager.getSortedByExpiration();
      console.log("Permanent events:", permanentEvents);

      // Transform into the format expected by the component
      const displayEvents = permanentEvents.map((event) => ({
        ...event,
        isPermanent: true,
        reset_info: {
          type: event.reset_type,
          day: event.reset_day,
          time: "04:00", // Default time
        },
      }));

      setEvents(displayEvents);
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
  };

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
      padding: 20,
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
          <View
            style={{ marginBottom: 10, backgroundColor: colors.background }}
          >
            <SeparatorWithText text={game} />
            <FlatList
              data={events.filter((event) => event.game_name === game)}
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
