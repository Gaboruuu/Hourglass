import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ImageBackground,
  Dimensions,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useEvents } from "@/context/EventsContext";
import { useUser } from "@/context/UserContext";
import { useNavigation } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function HomeScreen() {
  const { colors } = useTheme();
  const { apiEvents, permanentEvents, isLoading } = useEvents();
  const { user } = useUser();
  const navigation = useNavigation();

  // Placeholder data for codes - will be replaced with real data later
  const placeholderCodes = [
    { id: 1, game: "Genshin Impact", code: "GENSHINGIFT", expiresIn: "2 days" },
    {
      id: 2,
      game: "Honkai: Star Rail",
      code: "STARRAIL2024",
      expiresIn: "5 days",
    },
    { id: 3, game: "Zenless Zone Zero", code: "ZZZLAUNCH", expiresIn: "1 day" },
  ];

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  // Calculate stats
  const getCurrentEventsCount = () => {
    return apiEvents.filter((event) => {
      const now = new Date();
      const start = new Date(event.start_date);
      const end = new Date(event.expiry_date);
      return now >= start && now <= end;
    }).length;
  };

  const getUpcomingTodayCount = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return apiEvents.filter((event) => {
      const start = new Date(event.start_date);
      return start >= today && start < tomorrow;
    }).length;
  };

  const getFeaturedEvents = () => {
    const now = new Date();
    const currentEvents = apiEvents
      .filter((event) => {
        const start = new Date(event.start_date);
        const end = new Date(event.expiry_date);
        return now >= start && now <= end;
      })
      .sort(
        (a, b) =>
          new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime(),
      );

    return currentEvents.slice(0, 3);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 16,
    },
    // Version Notification Section
    versionNotification: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      borderLeftWidth: 4,
      borderLeftColor: colors.outline,
    },
    versionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    versionBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 6,
      marginRight: 8,
    },
    versionBadgeText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: "bold",
    },
    versionTitle: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "bold",
    },
    versionDescription: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
    // Greeting Section
    greetingSection: {
      marginBottom: 20,
    },
    greetingText: {
      color: colors.textPrimary,
      fontSize: 28,
      fontWeight: "bold",
    },
    usernameText: {
      color: colors.primary,
    },
    subtitleText: {
      color: colors.textSecondary,
      fontSize: 14,
      marginTop: 4,
    },
    // Quick Stats Section
    statsContainer: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "bold",
      marginBottom: 12,
    },
    statsRow: {
      flexDirection: "row",
      justifyContent: "space-around",
    },
    statItem: {
      alignItems: "center",
      flex: 1,
    },
    statNumber: {
      color: colors.primary,
      fontSize: 32,
      fontWeight: "bold",
    },
    statLabel: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 4,
      textAlign: "center",
    },
    // Featured Events Section
    featuredSection: {
      marginBottom: 20,
    },
    eventCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      overflow: "hidden",
      marginBottom: 12,
      height: 120,
    },
    eventBackground: {
      flex: 1,
      justifyContent: "flex-end",
    },
    eventOverlay: {
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      padding: 12,
    },
    eventName: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 4,
    },
    eventDetails: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    eventGame: {
      color: "#FFFFFF",
      fontSize: 12,
      opacity: 0.9,
    },
    eventTimer: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: "bold",
    },
    // Quick Actions Section
    actionsContainer: {
      marginBottom: 20,
    },
    actionsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: 12,
    },
    actionButton: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.outline,
    },
    actionButtonText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "600",
      marginTop: 8,
      textAlign: "center",
    },
    actionIcon: {
      fontSize: 24,
      marginBottom: 4,
    },
    // Codes Section
    codesSection: {
      marginBottom: 20,
    },
    codeCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.outline,
    },
    codeInfo: {
      flex: 1,
    },
    codeGame: {
      color: colors.textSecondary,
      fontSize: 12,
      marginBottom: 4,
    },
    codeText: {
      color: colors.textPrimary,
      fontSize: 18,
      fontWeight: "bold",
      fontFamily: "monospace",
      marginBottom: 4,
    },
    codeExpires: {
      color: colors.primary,
      fontSize: 11,
    },
    redeemButton: {
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
      marginLeft: 12,
    },
    redeemButtonText: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: "bold",
    },
    emptyState: {
      alignItems: "center",
      padding: 20,
    },
    emptyStateText: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: "center",
    },
    // Coming Soon Badge
    comingSoonBadge: {
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      alignSelf: "flex-start",
      marginBottom: 12,
    },
    comingSoonBadgeText: {
      color: colors.textPrimary,
      fontSize: 12,
      fontWeight: "bold",
    },
    disabledCodeCard: {
      opacity: 0.6,
    },
    disabledButton: {
      backgroundColor: colors.outline,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Version Notification */}
        <View style={styles.versionNotification}>
          <View style={styles.versionHeader}>
            <View style={styles.versionBadge}>
              <Text style={styles.versionBadgeText}>NEW</Text>
            </View>
            <Text style={styles.versionTitle}>Version 2.0.0 Available!</Text>
          </View>
          <Text style={styles.versionDescription}>
            Check out the latest features including enhanced notifications, new
            game support, and performance improvements.
          </Text>
        </View>

        {/* Greeting Section */}
        <View style={styles.greetingSection}>
          <Text style={styles.greetingText}>
            {getGreeting()}
            {user?.username ? ", " : ""}{" "}
            <Text style={styles.usernameText}>{user?.username}</Text>!
          </Text>
          <Text style={styles.subtitleText}>
            Here's what's happening with your events
          </Text>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>📊 Quick Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {isLoading ? "-" : getCurrentEventsCount()}
              </Text>
              <Text style={styles.statLabel}>Current{"\n"}Events</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {isLoading ? "-" : getUpcomingTodayCount()}
              </Text>
              <Text style={styles.statLabel}>Starting{"\n"}Today</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {isLoading ? "-" : apiEvents.length}
              </Text>
              <Text style={styles.statLabel}>Total{"\n"}Events</Text>
            </View>
          </View>
        </View>

        {/* Featured Events */}
        <View style={styles.featuredSection}>
          <Text style={styles.sectionTitle}>🔥 Featured Events</Text>
          {isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Loading events...</Text>
            </View>
          ) : getFeaturedEvents().length > 0 ? (
            getFeaturedEvents().map((event) => (
              <TouchableOpacity
                key={event.event_id}
                style={styles.eventCard}
                activeOpacity={0.8}
              >
                <ImageBackground
                  source={{ uri: event.background_url || undefined }}
                  style={styles.eventBackground}
                  imageStyle={{ opacity: 0.4 }}
                >
                  <View style={styles.eventOverlay}>
                    <Text style={styles.eventName} numberOfLines={1}>
                      {event.event_name}
                    </Text>
                    <View style={styles.eventDetails}>
                      <Text style={styles.eventGame}>{event.game_name}</Text>
                      <Text style={styles.eventTimer}>
                        Ends in {event.remaining}
                      </Text>
                    </View>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                No current events available
              </Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>⚡ Quick Actions</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("Settings" as never)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>⚙️</Text>
              <Text style={styles.actionButtonText}>Settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("Events" as never)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>📅</Text>
              <Text style={styles.actionButtonText}>Events</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.actionsRow, { marginTop: 12 }]}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => navigation.navigate("Permanent-events" as never)}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>♾️</Text>
              <Text style={styles.actionButtonText}>Permanent</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() =>
                navigation.navigate("NotificationPreferences" as never)
              }
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>🔔</Text>
              <Text style={styles.actionButtonText}>Notifications</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Latest Codes Section */}
        <View style={styles.codesSection}>
          <Text style={styles.sectionTitle}>🎁 Latest Codes</Text>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonBadgeText}>⏰ Coming Soon</Text>
          </View>
          {placeholderCodes.map((code) => (
            <View
              key={code.id}
              style={[styles.codeCard, styles.disabledCodeCard]}
            >
              <View style={styles.codeInfo}>
                <Text style={styles.codeGame}>{code.game}</Text>
                <Text style={styles.codeText}>{code.code}</Text>
                <Text style={styles.codeExpires}>
                  ⏰ Expires in {code.expiresIn}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.redeemButton, styles.disabledButton]}
                disabled={true}
                activeOpacity={0.8}
              >
                <Text style={styles.redeemButtonText}>Redeem</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
