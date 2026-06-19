import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SectionList,
  Modal,
  ActivityIndicator,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { useNotificationHistory } from "@/context/NotificationHistoryContext";
import SeparatorWithText from "@/components/ui/Separator";
import { Ionicons } from "@expo/vector-icons";

// Map game IDs to display names and emojis
const GAME_EMOJI_MAP: { [key: string]: { name: string; emoji: string } } = {
  hsr: { name: "Honkai: Star Rail", emoji: "🚂" },
  hi3: { name: "Honkai Impact 3rd", emoji: "🌸" },
  zzz: { name: "Zenless Zone Zero", emoji: "🤖" },
  pgr: { name: "Punishing Gray Raven", emoji: "⚔️" },
  gi: { name: "Genshin Impact", emoji: "🌊" },
  wuwa: { name: "Wuthering Waves", emoji: "🌀" },
};

const EVENT_TYPE_COLORS: { [key: string]: string } = {
  main: "#FF6B6B",
  side: "#4ECDC4",
  permanent: "#95E1D3",
};

function getAgeFilter(timestamp: string) {
  const notificationDate = new Date(timestamp);
  const today = new Date();
  const startOfToday = new Date(today);
  startOfToday.setHours(0, 0, 0, 0);

  const startOfNotificationDay = new Date(notificationDate);
  startOfNotificationDay.setHours(0, 0, 0, 0);

  const daysDifference = Math.floor(
    (startOfToday.getTime() - startOfNotificationDay.getTime()) / 86400000,
  );

  if (daysDifference <= 0) return "today";
  if (daysDifference === 1) return "yesterday";
  if (daysDifference <= 7) return "lastWeek";
  return "older";
}

function formatNotificationTimestamp(timestamp: string) {
  const date = new Date(timestamp);
  const timeStr = date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const ageFilter = getAgeFilter(timestamp);
  if (ageFilter === "older") {
    const dateStr = date.toLocaleDateString([], {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
    return `${timeStr} • ${dateStr}`;
  }

  return timeStr;
}

function getAgeGroup(timestamp: string) {
  const ageFilter = getAgeFilter(timestamp);

  if (ageFilter === "today") return "Today";
  if (ageFilter === "yesterday") return "Yesterday";
  if (ageFilter === "lastWeek") return "Last week";

  const date = new Date(timestamp);
  return date.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface NotificationItemProps {
  notification: any;
  colors: any;
}

function NotificationItem({ notification, colors }: NotificationItemProps) {
  const gameInfo = GAME_EMOJI_MAP[notification.gameId] || {
    name: notification.gameName,
    emoji: "🎮",
  };
  const eventTypeColor =
    EVENT_TYPE_COLORS[notification.eventType] || colors.primary;

  const timestampStr = formatNotificationTimestamp(notification.timestamp);

  const styles = StyleSheet.create({
    container: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      marginHorizontal: 15,
      marginVertical: 8,
      padding: 12,
      borderRadius: 10,
      borderLeftWidth: 4,
      borderLeftColor: eventTypeColor,
      opacity: 1,
    },
    emojiIcon: {
      fontSize: 28,
      marginRight: 12,
    },
    content: {
      flex: 1,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 6,
    },
    gameName: {
      fontSize: 14,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginRight: 8,
    },
    eventTypeBadge: {
      backgroundColor: eventTypeColor + "25",
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    eventTypeText: {
      fontSize: 11,
      fontWeight: "600",
      color: eventTypeColor,
    },
    eventName: {
      fontSize: 13,
      color: colors.textPrimary,
      marginBottom: 4,
    },
    footer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      alignItems: "center",
      marginTop: 4,
    },
    timestamp: {
      fontSize: 11,
      color: colors.textSecondary,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.emojiIcon}>{gameInfo.emoji}</Text>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.gameName}>{gameInfo.name}</Text>
          <View style={styles.eventTypeBadge}>
            <Text style={styles.eventTypeText}>
              {notification.eventType.toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.eventName} numberOfLines={1}>
          {notification.eventName}
        </Text>
        <View style={styles.footer}>
          <Text style={styles.timestamp}>{timestampStr}</Text>
        </View>
      </View>
    </View>
  );
}

export default function NotificationDebugTab() {
  const { notifications, clearHistory, isLoading } = useNotificationHistory();
  const { colors } = useTheme();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const groupedNotifications = notifications.reduce(
    (sections: { title: string; data: any[] }[], notification) => {
      const title = getAgeGroup(notification.timestamp);
      const existingSection = sections.find(
        (section) => section.title === title,
      );

      if (existingSection) {
        existingSection.data.push(notification);
      } else {
        sections.push({ title, data: [notification] });
      }

      return sections;
    },
    [],
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    filterContainer: {
      flexDirection: "row",
      paddingHorizontal: 15,
      paddingVertical: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
      gap: 8,
    },
    ageFilterContainer: {
      flexDirection: "row",
      paddingHorizontal: 15,
      paddingBottom: 12,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.separator,
      gap: 8,
      flexWrap: "wrap",
    },
    filterButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    filterButtonActive: {
      backgroundColor: colors.primary,
    },
    filterButtonText: {
      fontSize: 12,
      fontWeight: "600",
      color: colors.primary,
    },
    filterButtonTextActive: {
      color: "white",
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
    },
    emptyIcon: {
      fontSize: 48,
      marginBottom: 12,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: "center",
    },
    emptySubtext: {
      fontSize: 13,
      color: colors.textSecondary,
      textAlign: "center",
    },
    listContainer: {
      paddingVertical: 8,
      paddingBottom: 100,
    },
    sectionContainer: {
      marginBottom: 10,
    },
    sectionContent: {
      paddingTop: 4,
    },
    clearButton: {
      position: "absolute",
      bottom: 20,
      left: 20,
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "#ff4444",
      justifyContent: "center",
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
      zIndex: 10,
    },
    confirmModal: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "flex-end",
    },
    confirmContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      padding: 20,
    },
    confirmTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginBottom: 12,
    },
    confirmMessage: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 20,
    },
    buttonRow: {
      flexDirection: "row",
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.separator,
    },
    confirmButtonStyle: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 8,
      backgroundColor: "#ff4444",
    },
    buttonText: {
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
      color: colors.textPrimary,
    },
    confirmButtonText: {
      fontSize: 14,
      fontWeight: "600",
      textAlign: "center",
      color: "white",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
  });

  return (
    <View style={styles.container}>
      {/* Loading State */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📭</Text>
          <Text style={styles.emptyText}>No notifications received</Text>
          <Text style={styles.emptySubtext}>
            Your event notifications will appear here when received
          </Text>
        </View>
      ) : (
        <SectionList
          sections={groupedNotifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionContainer}>
              <SeparatorWithText text={section.title} />
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.sectionContent}>
              <NotificationItem notification={item} colors={colors} />
            </View>
          )}
          stickySectionHeadersEnabled={false}
          scrollEnabled
        />
      )}

      {/* Floating Clear Button */}
      <TouchableOpacity
        style={styles.clearButton}
        onPress={() => setShowClearConfirm(true)}
      >
        <Ionicons name="trash" size={24} color="white" />
      </TouchableOpacity>

      <Modal
        transparent
        visible={showClearConfirm}
        onRequestClose={() => setShowClearConfirm(false)}
      >
        <View style={styles.confirmModal}>
          <View style={styles.confirmContent}>
            <Text style={styles.confirmTitle}>Clear notification history?</Text>
            <Text style={styles.confirmMessage}>
              This will remove all {notifications.length} notification
              {notifications.length !== 1 ? "s" : ""} from your history.
            </Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowClearConfirm(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButtonStyle}
                onPress={() => {
                  clearHistory();
                  setShowClearConfirm(false);
                }}
              >
                <Text style={styles.confirmButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
