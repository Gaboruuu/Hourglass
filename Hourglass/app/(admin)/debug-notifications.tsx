import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { NotificationService } from "@/data/NotificationManager";
import { FilterManager } from "@/data/FilterManager";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DebugNotificationsScreen() {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      padding: 20,
    },
    header: {
      marginBottom: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginTop: 20,
      marginBottom: 15,
    },
    button: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 8,
      marginVertical: 5,
      alignItems: "center",
    },
    buttonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "bold",
    },
    dangerButton: {
      backgroundColor: "#ff4444",
    },
    warningButton: {
      backgroundColor: "#ff9800",
    },
    infoBox: {
      backgroundColor: colors.surface,
      padding: 15,
      borderRadius: 8,
      marginVertical: 5,
    },
    infoText: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>🔧 Notification Debug</Text>
          <Text style={styles.subtitle}>
            Advanced debugging tools for notification system
          </Text>
        </View>

        {/* Test Notifications Section */}
        <Text style={styles.sectionTitle}>Test Notifications</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            const result = await NotificationService.sendTestNotification();
            Alert.alert(
              result ? "Success" : "Error",
              result
                ? "Test notification sent! Check your notification tray."
                : "Failed to send test notification. Check console for details."
            );
          }}
        >
          <Text style={styles.buttonText}>Send Test Notification</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            const result =
              await NotificationService.sendTestScheduledNotification();
            Alert.alert(
              result ? "Success" : "Error",
              result
                ? "Scheduled notification will appear in 5 seconds! Use 'Check Scheduled Notifications' to verify it was scheduled."
                : "Failed to schedule test notification. Check console for details."
            );
          }}
        >
          <Text style={styles.buttonText}>⏰ Test Scheduled Notification</Text>
        </TouchableOpacity>

        {/* System Diagnostics Section */}
        <Text style={styles.sectionTitle}>System Diagnostics</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            console.log("Running comprehensive notification debug...");
            const result = await NotificationService.debugNotificationSystem();

            if (result) {
              Alert.alert(
                "Debug Complete",
                `Device: ${result.isDevice ? "Physical" : "Emulator"}\n` +
                  `Platform: ${result.platform}\n` +
                  `Permission: ${result.permissionStatus}\n` +
                  `Configured: ${result.isConfigured ? "Yes" : "No"}\n` +
                  `Scheduled: ${result.totalScheduled} total, ${result.eventNotifications} events\n` +
                  `Test Schedule: ${
                    result.testScheduleSuccess ? "SUCCESS ✅" : "FAILED ❌"
                  }\n\n` +
                  `Check console for detailed logs.`,
                [{ text: "OK" }]
              );
            } else {
              Alert.alert(
                "Debug Failed",
                "Error running debug. Check console for details.",
                [{ text: "OK" }]
              );
            }
          }}
        >
          <Text style={styles.buttonText}>🔍 Run Full System Debug</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            try {
              const prefs = await FilterManager.loadNotificationPreferences();
              const gamesWithPrefs = Object.keys(prefs.gamePreferences);

              let message = `Global Enabled: ${prefs.enabled}\n\n`;
              message += `Games with preferences: ${gamesWithPrefs.length}\n\n`;

              if (gamesWithPrefs.length > 0) {
                message += "Games:\n";
                gamesWithPrefs.forEach((game) => {
                  const gamePrefs = prefs.gamePreferences[game];
                  message += `\n${game}:\n`;
                  message += `  Main: ${gamePrefs.main.join(", ") || "none"}\n`;
                  message += `  Side: ${gamePrefs.side.join(", ") || "none"}\n`;
                  message += `  Permanent: ${
                    gamePrefs.permanent.join(", ") || "none"
                  }\n`;
                });
              } else {
                message += "\nNo game preferences saved!";
              }

              console.log("Full preferences object:", prefs);

              Alert.alert("Notification Preferences", message, [
                { text: "OK" },
                {
                  text: "View Console",
                  onPress: () => {
                    console.log("=== FULL PREFERENCES ===");
                    console.log(JSON.stringify(prefs, null, 2));
                  },
                },
              ]);
            } catch (error) {
              console.error("Error loading preferences:", error);
              Alert.alert(
                "Error",
                "Failed to load preferences. Check console."
              );
            }
          }}
        >
          <Text style={styles.buttonText}>📄 View Stored Preferences</Text>
        </TouchableOpacity>

        {/* Scheduled Notifications Section */}
        <Text style={styles.sectionTitle}>Scheduled Notifications</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={async () => {
            const info =
              await NotificationService.getScheduledNotificationsDetails();

            // Build detailed message
            let message = `Total: ${info.total}\n`;
            message += `Event notifications: ${info.eventCount}\n`;
            message += `Test notifications: ${info.testCount}\n`;
            message += `Other: ${info.otherCount}\n\n`;

            if (info.details.length > 0) {
              message += "Details:\n";
              info.details.forEach((detail, index) => {
                message += `\n${index + 1}. ${detail.title}\n`;
                if (detail.eventId) {
                  message += `   Event: ${detail.eventId}\n`;
                  message += `   Type: ${detail.notificationType}\n`;
                }
                if (detail.triggerDate) {
                  message += `   Trigger: ${detail.triggerDate}\n`;
                }
                if (detail.timeUntilTrigger) {
                  message += `   Time until: ${detail.timeUntilTrigger}\n`;
                }
              });
            } else {
              message += "\nNo notifications scheduled.";
            }

            // Also log to console for full details
            console.log("Full notification details:", info);

            Alert.alert("Scheduled Notifications", message, [
              { text: "OK" },
              {
                text: "View Console",
                onPress: () => {
                  console.log("=== USER REQUESTED FULL DETAILS ===");
                  console.log(JSON.stringify(info, null, 2));
                },
              },
            ]);
          }}
        >
          <Text style={styles.buttonText}>
            📋 Check Scheduled Notifications
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.warningButton]}
          onPress={async () => {
            Alert.alert(
              "Cancel All Notifications",
              "This will cancel ALL scheduled notifications (including event notifications). Continue?",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Cancel All",
                  style: "destructive",
                  onPress: async () => {
                    const count =
                      await NotificationService.cancelAllNotifications();
                    Alert.alert(
                      "Success",
                      `Cancelled ${count} notification(s).`,
                      [{ text: "OK" }]
                    );
                  },
                },
              ]
            );
          }}
        >
          <Text style={styles.buttonText}>❌ Cancel All Notifications</Text>
        </TouchableOpacity>

        {/* Danger Zone Section */}
        <Text style={styles.sectionTitle}>⚠️ Danger Zone</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            The following actions will reset all app settings and cannot be
            undone. Use with caution.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, styles.dangerButton]}
          onPress={async () => {
            Alert.alert(
              "Reset All Settings",
              "This will reset all app settings to defaults including:\n\n• Theme (to System)\n• Region (to Europe)\n• All notification preferences\n• All scheduled notifications\n• UI filters\n\nThis action cannot be undone. Continue?",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Reset Everything",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      console.log("Starting full app reset...");

                      // 1. Cancel all scheduled notifications
                      await NotificationService.cancelAllEventNotifications();
                      console.log("✓ Cancelled all notifications");

                      // 2. Clear all AsyncStorage data
                      const keys = await AsyncStorage.getAllKeys();
                      await AsyncStorage.multiRemove(keys);
                      console.log("✓ Cleared all AsyncStorage data");

                      // 3. Reconfigure notifications
                      await NotificationService.configureNotifications();
                      console.log("✓ Reconfigured notifications");

                      Alert.alert(
                        "Reset Complete",
                        "All settings have been reset to defaults. Please restart the app for changes to take full effect.",
                        [{ text: "OK" }]
                      );

                      console.log("Full app reset completed successfully");
                    } catch (error) {
                      console.error("Error resetting all settings:", error);
                      Alert.alert(
                        "Reset Failed",
                        "An error occurred while resetting settings. Check console for details."
                      );
                    }
                  },
                },
              ]
            );
          }}
        >
          <Text style={styles.buttonText}>🔄 Reset All Settings</Text>
        </TouchableOpacity>

        {/* Info Section */}
        <Text style={styles.sectionTitle}>ℹ️ About</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            This screen contains advanced debugging tools for the notification
            system. All actions are logged to the console.
            {"\n\n"}
            To view console logs:{"\n"}• Run: npx react-native log-android{"\n"}
            • Or check Metro bundler output
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
