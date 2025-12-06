import React, { useState, useEffect, useMemo } from "react";
import { View, FlatList, Text, StyleSheet } from "react-native";
import PermanentEventCard from "@/components/events/PermanentEventCard";
import SeparatorWithText from "@/components/ui/Separator";
import { useTheme } from "@/context/ThemeContext";
import { useEvents } from "@/context/EventsContext";

export default function PermanentEventsScreen() {
  const { colors } = useTheme();
  const { permanentEvents, games, isLoading } = useEvents();

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

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading permanent events...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={games}
        keyExtractor={(game, index) => `game-${game}-${index}`}
        contentContainerStyle={styles.list}
        renderItem={({ item: game }) => (
          <View
            style={{ marginBottom: 10, backgroundColor: colors.background }}
          >
            <SeparatorWithText text={game} />
            <FlatList
              data={permanentEvents.filter((event) => event.game_name === game)}
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
