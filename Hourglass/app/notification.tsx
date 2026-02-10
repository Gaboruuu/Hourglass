import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";
import {
  FlatList,
  ScrollView,
  Switch,
  TouchableOpacity,
} from "react-native-gesture-handler";
import { FilterManager } from "@/data/FilterManager";
import { NotificationService } from "@/data/NotificationManager";
import { Ionicons } from "@expo/vector-icons";
import { logger } from "@/utils/logger";
import EventsDataManager from "@/data/EventsDataManager";

export default function NotificationPreferencesScreen() {
  const { colors } = useTheme();
  const [availableGames, setAvailableGames] = useState<string[]>([]);
  const [userSelectedGames, setUserSelectedGames] = useState<string[]>([]);
  const [eventTypes] = useState<string[]>(["main", "side", "permanent"]);
  const [notificationTimes] = useState<string[]>(["3days", "1day", "2hours"]);
  const [preferences, setPreferences] = useState(
    FilterManager.DEFAULT_NOTIFICATION_PREFS,
  );
  const [expandedGames, setExpandedGames] = useState<Set<string>>(new Set());
  const [activeNotifications, setActiveNotifications] = useState<{
    [key: string]: boolean;
  }>({});
  const [globalEnabled, setGlobalEnabled] = useState(false);

  useEffect(() => {
    fetchPreferences();
    fetchAvailableGames();
    loadNotificationStates();
    loadUserGamePreferences();
  }, []);

  const loadUserGamePreferences = async () => {
    try {
      const selectedGames = await FilterManager.getUserSelectedGames();
      setUserSelectedGames(selectedGames);
    } catch (error) {
      console.error("Error loading user game preferences:", error);
    }
  };

  const loadNotificationStates = async () => {
    try {
      const prefs = await FilterManager.loadNotificationPreferences();
      const newActiveNotifications: { [key: string]: boolean } = {};

      // Update global enabled state
      setGlobalEnabled(prefs.enabled);

      // Convert the saved preferences to our UI state format
      Object.entries(prefs.gamePreferences).forEach(([gameName, gamePrefs]) => {
        eventTypes.forEach((eventType) => {
          const eventTypeName = eventType as keyof typeof gamePrefs;
          const enabledTimes = gamePrefs[eventTypeName] || [];

          notificationTimes.forEach((time) => {
            const key = `${gameName}-${eventType}-${time}`;
            newActiveNotifications[key] = enabledTimes.includes(time as any);
          });
        });
      });

      setActiveNotifications(newActiveNotifications);
    } catch (error) {
      console.error("Error loading notification states:", error);
    }
  };

  const fetchPreferences = async () => {
    const prefs = await FilterManager.loadNotificationPreferences();
    setPreferences(prefs);
  };

  const fetchAvailableGames = async () => {
    try {
      // Show ALL games in notification preferences (not filtered)
      // This allows users to see and keep their notification preferences
      // even for games they haven't selected in game preferences
      const games = await FilterManager.getAvailableGames([]);
      setAvailableGames(games);

      // Initialize preferences for all games
      for (const game of games) {
        await FilterManager.initializeGamePreferences(game);
      }

      // Reload notification states after initializing games
      await loadNotificationStates();
    } catch (error) {
      console.error("Error fetching games:", error);
    }
  };

  const toggleGameExpansion = (game: string) => {
    const newExpanded = new Set(expandedGames);
    if (newExpanded.has(game)) {
      newExpanded.delete(game);
    } else {
      newExpanded.add(game);
    }
    setExpandedGames(newExpanded);
  };

  const toggleNotification = async (
    game: string,
    eventType: string,
    time: string,
  ) => {
    const key = `${game}-${eventType}-${time}`;
    const newValue = !activeNotifications[key];

    // Update UI state
    setActiveNotifications((prev) => ({
      ...prev,
      [key]: newValue,
    }));

    // Save to persistent storage
    await saveNotificationPreference(game, eventType, time, newValue);
  };

  const saveNotificationPreference = async (
    game: string,
    eventType: string,
    time: string,
    isActive: boolean,
  ) => {
    try {
      const prefs = await FilterManager.loadNotificationPreferences();

      // Initialize game preferences if not exists
      if (!prefs.gamePreferences[game]) {
        await FilterManager.initializeGamePreferences(game);
        prefs.gamePreferences[game] = { ...FilterManager.DEFAULT_GAME_PREFS };
      }

      // Get current notification times for this event type
      const currentTimes =
        prefs.gamePreferences[game][
          eventType as keyof (typeof prefs.gamePreferences)[typeof game]
        ] || [];
      let updatedTimes = [...currentTimes];

      if (isActive) {
        // Add time if not already present
        if (!updatedTimes.includes(time as any)) {
          updatedTimes.push(time as any);
        }

        // ✅ AUTO-ENABLE: When user selects any notification, enable global notifications
        if (!prefs.enabled) {
          await FilterManager.setGlobalNotificationEnabled(true);
          // Update only the global enabled state, don't reload all notification states
          setGlobalEnabled(true);
          logger.info(
            "NotificationScreen",
            `Auto-enabled global notifications when user selected ${game} ${eventType} ${time}`,
          );
        }
      } else {
        // Remove time if present
        updatedTimes = updatedTimes.filter((t) => t !== time);
      }

      // Update preferences
      await FilterManager.updateGameEventPreferences(
        game,
        eventType as any,
        updatedTimes,
      );

      // Reschedule notifications for this specific event type
      await rescheduleNotificationsForEventType(game, eventType);

      // Refresh notifications from server
      await EventsDataManager.refreshNotifications();
    } catch (error) {
      logger.error(
        "NotificationScreen",
        `Failed to save notification preference for ${game} ${eventType} ${time}`,
        error,
      );
    }
  };

  const rescheduleNotificationsForGame = async (game: string) => {
    try {
      // Get permanent events
      const permanentEventsManager =
        require("@/data/permanentEvents/PermanentEventsManager").default;
      const permanentEvents = permanentEventsManager.getSortedByExpiration();

      // Get API events
      let apiEvents: any[] = [];
      try {
        const response = await fetch(
          "https://hourglass-h6zo.onrender.com/api/events",
        );
        apiEvents = await response.json();
      } catch (error) {
        console.error("Error fetching API events:", error);
      }

      // Combine both types of events and filter for this specific game
      const allEvents = [...permanentEvents, ...apiEvents];
      const gameEvents = allEvents.filter(
        (event: any) => event.game_name === game,
      );

      // Cancel existing notifications for this game
      for (const event of gameEvents) {
        await NotificationService.cancelNotification(
          `event-${event.event_id}-3days`,
        );
        await NotificationService.cancelNotification(
          `event-${event.event_id}-1day`,
        );
        await NotificationService.cancelNotification(
          `event-${event.event_id}-2hours`,
        );
      }

      // Reschedule notifications for this game
      for (const event of gameEvents) {
        await NotificationService.scheduleNotificationsForEvent(event);
      }

      logger.info(
        "NotificationScreen",
        `Rescheduled ${gameEvents.length} events for ${game}`,
      );
    } catch (error) {
      logger.error(
        "NotificationScreen",
        `Failed to reschedule notifications for ${game}`,
        error,
      );
    }
  };

  const rescheduleNotificationsForEventType = async (
    game: string,
    eventType: string,
  ) => {
    try {
      // Get permanent events
      const permanentEventsManager =
        require("@/data/permanentEvents/PermanentEventsManager").default;
      const permanentEvents = permanentEventsManager.getSortedByExpiration();

      // Get API events
      let apiEvents: any[] = [];
      try {
        const response = await fetch(
          "https://hourglass-h6zo.onrender.com/api/events",
        );
        apiEvents = await response.json();
      } catch (error) {
        console.error("Error fetching API events:", error);
      }

      // Combine both types of events and filter for this specific game and event type
      const allEvents = [...permanentEvents, ...apiEvents];
      const filteredEvents = allEvents.filter(
        (event: any) =>
          event.game_name === game && event.event_type === eventType,
      );

      // Cancel and reschedule notifications for these specific events
      for (const event of filteredEvents) {
        await NotificationService.cancelNotification(
          `event-${event.event_id}-3days`,
        );
        await NotificationService.cancelNotification(
          `event-${event.event_id}-1day`,
        );
        await NotificationService.cancelNotification(
          `event-${event.event_id}-2hours`,
        );
        await NotificationService.scheduleNotificationsForEvent(event);
      }

      logger.info(
        "NotificationScreen",
        `Rescheduled ${filteredEvents.length} ${game} ${eventType} events`,
      );
    } catch (error) {
      logger.error(
        "NotificationScreen",
        `Failed to reschedule ${game} ${eventType} events`,
        error,
      );
    }
  };

  const isNotificationActive = (
    game: string,
    eventType: string,
    time: string,
  ) => {
    const key = `${game}-${eventType}-${time}`;
    return activeNotifications[key] || false;
  };

  const toggleAllForGame = async (game: string) => {
    const newNotifications = { ...activeNotifications };
    const allActive = eventTypes.every((eventType) =>
      notificationTimes.every((time) => {
        const key = `${game}-${eventType}-${time}`;
        return newNotifications[key];
      }),
    );

    // Update UI state
    eventTypes.forEach((eventType) => {
      notificationTimes.forEach((time) => {
        const key = `${game}-${eventType}-${time}`;
        newNotifications[key] = !allActive;
      });
    });

    setActiveNotifications(newNotifications);

    // Save all preferences for this game
    try {
      const prefs = await FilterManager.loadNotificationPreferences();

      // Initialize game preferences if not exists
      if (!prefs.gamePreferences[game]) {
        await FilterManager.initializeGamePreferences(game);
      }

      // Update each event type
      for (const eventType of eventTypes) {
        const updatedTimes = !allActive ? [...notificationTimes] : [];
        await FilterManager.updateGameEventPreferences(
          game,
          eventType as any,
          updatedTimes as any,
        );
      }

      // Reschedule notifications for this game
      await rescheduleNotificationsForGame(game);

      logger.info(
        "NotificationScreen",
        `Updated all notification preferences for ${game} (${
          !allActive ? "enabled all" : "disabled all"
        })`,
      );
    } catch (error) {
      logger.error(
        "NotificationScreen",
        `Failed to save all preferences for ${game}`,
        error,
      );
    }
  };

  const toggleAllForEventType = async (game: string, eventType: string) => {
    const newNotifications = { ...activeNotifications };
    const allActive = notificationTimes.every((time) => {
      const key = `${game}-${eventType}-${time}`;
      return newNotifications[key];
    });

    // Update UI state
    notificationTimes.forEach((time) => {
      const key = `${game}-${eventType}-${time}`;
      newNotifications[key] = !allActive;
    });

    setActiveNotifications(newNotifications);

    // Save preferences for this event type
    try {
      const updatedTimes = !allActive ? [...notificationTimes] : [];
      await FilterManager.updateGameEventPreferences(
        game,
        eventType as any,
        updatedTimes as any,
      );

      // Reschedule notifications for this specific event type
      await rescheduleNotificationsForEventType(game, eventType);

      logger.info(
        "NotificationScreen",
        `Updated ${game} ${eventType} notifications (${
          !allActive ? "enabled all" : "disabled all"
        })`,
      );
    } catch (error) {
      logger.error(
        "NotificationScreen",
        `Failed to save preferences for ${game} ${eventType}`,
        error,
      );
    }
  };

  const isAllActiveForGame = (game: string) => {
    return eventTypes.every((eventType) =>
      notificationTimes.every((time) => {
        const key = `${game}-${eventType}-${time}`;
        return activeNotifications[key];
      }),
    );
  };

  const isAllActiveForEventType = (game: string, eventType: string) => {
    return notificationTimes.every((time) => {
      const key = `${game}-${eventType}-${time}`;
      return activeNotifications[key];
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: 50,
    },
    pageTitle: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: 8,
      letterSpacing: 0.5,
    },
    pageSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 20,
      paddingHorizontal: 20,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    gameCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 16,
      marginBottom: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 6,
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.outline + "40",
    },
    gameHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 4,
    },
    gameTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: colors.textPrimary,
      flex: 1,
      letterSpacing: 0.3,
    },
    gameChevron: {
      marginLeft: 8,
      padding: 4,
    },
    gameContent: {
      marginTop: 12,
    },
    selectAllGameButton: {
      marginBottom: 12,
      alignSelf: "flex-end",
    },
    selectAllButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      borderWidth: 1.5,
      backgroundColor: colors.primary + "10",
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
    selectAllButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary,
      letterSpacing: 0.2,
    },
    selectAllEventButton: {
      marginLeft: "auto",
    },
    eventTypeContainer: {
      marginBottom: 10,
    },
    eventTypeHeader: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: colors.primary + "12",
      borderRadius: 12,
      marginBottom: 8,
      borderLeftWidth: 3,
      borderLeftColor: colors.primary,
    },
    eventTypeIcon: {
      marginRight: 10,
      padding: 2,
    },
    eventTypeTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: colors.primary,
      flex: 1,
      letterSpacing: 0.2,
    },
    eventTypeChevron: {
      opacity: 0.6,
    },
    timeOptionsContainer: {
      backgroundColor: colors.background + "80",
      borderRadius: 12,
      padding: 8,
      marginLeft: 4,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      borderWidth: 1,
      borderColor: colors.outline + "30",
    },
    notificationButton: {
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
      borderWidth: 1.5,
      minWidth: 75,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    activeButton: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.3,
    },
    inactiveButton: {
      backgroundColor: colors.surface,
      borderColor: colors.outline + "60",
    },
    activeButtonText: {
      fontSize: 13,
      fontWeight: "600",
      color: "white",
      textAlign: "center",
      letterSpacing: 0.2,
    },
    inactiveButtonText: {
      fontSize: 13,
      fontWeight: "500",
      color: colors.textSecondary,
      textAlign: "center",
      letterSpacing: 0.1,
    },
    emptyState: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: 60,
    },
    emptyStateIcon: {
      marginBottom: 16,
      opacity: 0.3,
    },
    emptyStateText: {
      fontSize: 18,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      opacity: 0.7,
    },
  });

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case "main":
        return "star";
      case "side":
        return "list";
      case "permanent":
        return "infinite";
      default:
        return "calendar";
    }
  };

  const getTimeLabel = (time: string) => {
    switch (time) {
      case "3days":
        return "3 days";
      case "1day":
        return "1 day";
      case "2hours":
        return "2 hours";
      default:
        return time;
    }
  };

  if (availableGames.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.pageTitle}>Notifications</Text>
        <Text style={styles.pageSubtitle}>
          Customize your event notifications
        </Text>

        <View style={styles.emptyState}>
          <Ionicons
            name="notifications-off-outline"
            size={64}
            color={colors.textSecondary}
            style={styles.emptyStateIcon}
          />
          <Text style={styles.emptyStateText}>No games available</Text>
          <Text style={styles.emptyStateSubtext}>
            Check back later for notification settings
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.pageTitle}>Notifications</Text>
      <Text style={styles.pageSubtitle}>
        Customize your event notifications
      </Text>

      {/* Global Notification Status Banner */}
      {!globalEnabled && (
        <View
          style={{
            backgroundColor: "#ff6b6b20",
            borderLeftWidth: 4,
            borderLeftColor: "#ff6b6b",
            padding: 12,
            marginHorizontal: 16,
            marginBottom: 12,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 14,
              fontWeight: "600",
              marginBottom: 4,
            }}
          >
            ⚠️ Global Notifications Disabled
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 12,
            }}
          >
            Notifications are currently disabled. They will be automatically
            enabled when you select notification times below.
          </Text>
        </View>
      )}

      {globalEnabled && (
        <View
          style={{
            backgroundColor: "#51cf6620",
            borderLeftWidth: 4,
            borderLeftColor: "#51cf66",
            padding: 12,
            marginHorizontal: 16,
            marginBottom: 12,
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              color: colors.textPrimary,
              fontSize: 14,
              fontWeight: "600",
            }}
          >
            ✅ Notifications Active
          </Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {availableGames.map((game) => {
          const isExpanded = expandedGames.has(game);
          const isGameActive =
            userSelectedGames.length === 0 || userSelectedGames.includes(game);
          return (
            <View key={game} style={styles.gameCard}>
              <TouchableOpacity
                style={styles.gameHeader}
                onPress={() => toggleGameExpansion(game)}
              >
                <View
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Text style={styles.gameTitle}>{game}</Text>
                  {!isGameActive && (
                    <View
                      style={{
                        marginLeft: 8,
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        backgroundColor: colors.textSecondary + "20",
                        borderRadius: 4,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          color: colors.textSecondary,
                          fontWeight: "600",
                        }}
                      >
                        Inactive
                      </Text>
                    </View>
                  )}
                </View>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.textSecondary}
                  style={styles.gameChevron}
                />
              </TouchableOpacity>

              {isExpanded && (
                <View style={styles.gameContent}>
                  {!isGameActive && (
                    <View
                      style={{
                        backgroundColor: colors.textSecondary + "15",
                        padding: 10,
                        borderRadius: 8,
                        marginBottom: 12,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          color: colors.textSecondary,
                          textAlign: "center",
                        }}
                      >
                        ℹ️ This game is not in your game preferences.
                        Notifications are paused but settings are saved.
                      </Text>
                    </View>
                  )}
                  <View style={styles.selectAllGameButton}>
                    <TouchableOpacity
                      style={styles.selectAllButton}
                      onPress={() => toggleAllForGame(game)}
                    >
                      <Text style={styles.selectAllButtonText}>
                        <Ionicons
                          name={
                            isAllActiveForGame(game)
                              ? "checkmark-circle"
                              : "add-circle"
                          }
                          size={12}
                          color={colors.primary}
                        />{" "}
                        {isAllActiveForGame(game)
                          ? "Deselect All"
                          : "Select All"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {eventTypes.map((eventType) => (
                    <View key={eventType} style={styles.eventTypeContainer}>
                      <View style={styles.eventTypeHeader}>
                        <Ionicons
                          name={getEventTypeIcon(eventType)}
                          size={16}
                          color={colors.primary}
                          style={styles.eventTypeIcon}
                        />
                        <Text style={styles.eventTypeTitle}>
                          {eventType.charAt(0).toUpperCase() +
                            eventType.slice(1)}{" "}
                          Events
                        </Text>
                        <TouchableOpacity
                          style={[
                            styles.selectAllButton,
                            styles.selectAllEventButton,
                          ]}
                          onPress={() => toggleAllForEventType(game, eventType)}
                        >
                          <Text style={styles.selectAllButtonText}>
                            <Ionicons
                              name={
                                isAllActiveForEventType(game, eventType)
                                  ? "remove-circle"
                                  : "add-circle"
                              }
                              size={10}
                              color={colors.primary}
                            />{" "}
                            {isAllActiveForEventType(game, eventType)
                              ? "All Off"
                              : "All On"}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={styles.timeOptionsContainer}>
                        {notificationTimes.map((time) => (
                          <TouchableOpacity
                            key={time}
                            style={[
                              styles.notificationButton,
                              isNotificationActive(game, eventType, time)
                                ? styles.activeButton
                                : styles.inactiveButton,
                            ]}
                            onPress={() =>
                              toggleNotification(game, eventType, time)
                            }
                          >
                            <Text
                              style={
                                isNotificationActive(game, eventType, time)
                                  ? styles.activeButtonText
                                  : styles.inactiveButtonText
                              }
                            >
                              {getTimeLabel(time)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
