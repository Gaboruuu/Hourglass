import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
} from "react-native";
import PermanentEventCard from "@/components/events/PermanentEventCard";
import SeparatorWithText from "@/components/ui/Separator";
import { useTheme } from "@/context/ThemeContext";
import { useRegionContext } from "@/context/RegionContext";
import permanentEventsManager from "@/data/permanentEvents/PermanentEventsManager";
import { NotificationService } from "@/data/NotificationManager";
import { ProcessedEvent } from "@/data/EventInteface";

export default function PermanentEventsScreen() {
  const [events, setEvents] = useState<ProcessedEvent[]>([]);
  const [gamesList, setGamesList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const regionContext = useRegionContext();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    permanentEventsManager.syncWithRegionContext(regionContext);
    fetchPermanentEvents();
  }, [regionContext.region]); // Re-run when region changes

  useEffect(() => {
    fetchPermanentEvents();

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

  const fetchPermanentEvents = async () => {
    try {
      console.log("Fetching permanent events...");
      // Get all events sorted by expiration date
      const permanentEvents = permanentEventsManager.getSortedByExpiration();
      console.log("Permanent events:", permanentEvents);

      setEvents(permanentEvents);

      // Only verify notifications on first load - don't reschedule if already scheduled
      if (notificationsEnabled && loading) {
        console.log(
          "Verifying notifications for permanent events on initial load"
        );
        // Our improved scheduleNotificationsForEvents will check for existing notifications
        await NotificationService.scheduleNotificationsForEvents(
          permanentEvents
        );
      }
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
              keyExtractor={(event) => event.event_id}
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
