import React, { useState, useEffect } from "react";
import { View, FlatList, Text, StyleSheet } from "react-native";
import PermanentEventCard from "@/components/events/PermanentEventCard";
import SeparatorWithText from "@/components/ui/Separator";
import { useTheme } from "@/context/ThemeContext";
import { useRegionContext } from "@/context/RegionContext";
import permanentEventsManager from "@/data/permanentEvents/PermanentEventsManager";
import { ProcessedEvent } from "@/data/EventInteface";
import { logger } from "@/utils/logger";
import { useEventNotifications } from "@/hooks/useEventNotifications";

export default function PermanentEventsScreen() {
  const [events, setEvents] = useState<ProcessedEvent[]>([]);
  const [gamesList, setGamesList] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors } = useTheme();
  const regionContext = useRegionContext();

  // Use the custom hook for notification management
  const { notificationsEnabled } = useEventNotifications({
    events,
    loading,
    screenName: "PermanentEventsScreen",
    eventType: "permanent",
  });

  useEffect(() => {
    permanentEventsManager.syncWithRegionContext(regionContext);
    fetchPermanentEvents();

    const interval = setInterval(() => {
      fetchPermanentEvents();
    }, 60000); // 60 seconds = 1 minute

    return () => clearInterval(interval);
  }, [regionContext.region]); // Re-run when region changes

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
      logger.info(
        "PermanentEventsScreen",
        `Fetched ${permanentEvents.length} permanent events from manager`
      );

      setEvents(permanentEvents);
    } catch (error) {
      console.error("Error fetching permanent events:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGames = () => {
    try {
      const uniqueGames: string[] = [];
      for (const event of events) {
        if (event.game_name && !uniqueGames.includes(event.game_name)) {
          uniqueGames.push(event.game_name);
        }
      }
      setGamesList(uniqueGames);
      logger.info(
        "PermanentEventsScreen",
        `Extracted ${uniqueGames.length} unique games from permanent events`
      );
    } catch (error) {
      logger.error(
        "PermanentEventsScreen",
        "Failed to extract unique games from permanent events",
        error
      );
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
        keyExtractor={(game, index) => `game-${game}-${index}`}
        contentContainerStyle={styles.list}
        renderItem={({ item: game }) => (
          <View
            style={{ marginBottom: 10, backgroundColor: colors.background }}
          >
            <SeparatorWithText text={game} />
            <FlatList
              data={events.filter((event) => event.game_name === game)}
              keyExtractor={(event, index) =>
                `${game}-${event.event_id}-${index}`
              }
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
