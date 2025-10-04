import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  Image,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { Picker } from "@react-native-picker/picker";
import { useRegionContext } from "@/context/RegionContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NotificationService } from "@/data/NotificationManager";

export default function SettingsScreen() {
  const { colors, isDark, theme, setTheme } = useTheme();
  const { region, setRegion, availableRegions } = useRegionContext();

  // App settings states
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Load notification preferences on component mount
  useEffect(() => {
    const loadNotificationPreference = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem(
          "notificationsEnabled"
        );
        setNotificationsEnabled(savedPreference === "true");

        // Configure notifications
        NotificationService.configureNotifications();
      } catch (error) {
        console.error("Error loading notification preference:", error);
      }
    };

    loadNotificationPreference();
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      padding: 20,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginTop: 20,
      marginBottom: 15,
    },
    settingItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 15,
      paddingHorizontal: 10,
      backgroundColor: colors.surface,
      marginBottom: 10,
      borderRadius: 8,
    },
    settingText: {
      fontSize: 16,
      color: colors.textPrimary,
      flex: 1,
    },
    settingDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 4,
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
    themeButton: {
      backgroundColor: colors.surface,
      padding: 15,
      borderRadius: 8,
      marginVertical: 5,
      alignItems: "center",
      borderWidth: theme === "system" ? 2 : 1,
      borderColor: theme === "system" ? colors.primary : colors.secondary,
    },
    themeButtonText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: theme === "system" ? "bold" : "normal",
    },
    profileImage: {
      marginTop: 20,
      width: 100,
      height: 100,
      borderRadius: 50,
      marginBottom: 15,
      alignSelf: "center",
      borderWidth: 2,
      borderColor: colors.separator,
      backgroundColor: colors.background,
    },
    userName: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.textPrimary,
      textAlign: "center",
      marginBottom: 10,
    },
  });

  const handleThemeChange = () => {
    if (theme === "light") {
      setTheme("dark");
    } else if (theme === "dark") {
      setTheme("system");
    } else {
      setTheme("light");
    }
  };

  const handleRegionChange = () => {
    const currentIndex = availableRegions.indexOf(region);
    const nextIndex = (currentIndex + 1) % availableRegions.length;
    setRegion(availableRegions[nextIndex]);
  };
  const getRegionDisplayText = () => {
    switch (region) {
      case "europe":
        return "Europe";
      case "northAmerica":
        return "North America";
      case "asia":
        return "Asia";
      default:
        return "Unknown";
    }
  };

  const getThemeDisplayText = () => {
    switch (theme) {
      case "light":
        return "Light Mode";
      case "dark":
        return "Dark Mode";
      case "system":
        return "System Default";
      default:
        return "System Default";
    }
  };

  // Toggle notifications and handle permissions
  const toggleNotifications = async (value: boolean) => {
    try {
      if (value === true) {
        // We're enabling notifications, so request permissions
        const hasPermission = await NotificationService.requestPermissions();
        if (!hasPermission) {
          Alert.alert(
            "Permission Required",
            "Notifications permission is required to send event reminders. Please enable it in your device settings.",
            [{ text: "OK" }]
          );
          return;
        }

        // Only configure notifications but don't schedule anything here
        // Scheduling will happen in the permanent events screen when it comes into focus
        NotificationService.configureNotifications();
      } else {
        // We're disabling notifications, cancel all scheduled ones
        await NotificationService.cancelAllEventNotifications();
      }

      // Update state and save to AsyncStorage
      setNotificationsEnabled(value);
      await AsyncStorage.setItem("notificationsEnabled", value.toString());
      console.log("Notification preference saved:", value);
    } catch (error) {
      console.error("Error toggling notifications:", error);
      Alert.alert("Error", "Failed to update notification settings");
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <Image
          source={{ uri: "https://i.imgur.com/Zc3ndL7.jpeg" }} // Replace with your image URL
          style={styles.profileImage}
        />
        <Text style={styles.userName}>@username</Text>

        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity>
              <Text style={styles.settingText}>@username</Text>
              <Text style={styles.settingDescription}>Username</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity>
              <Text style={styles.settingText}>Password</Text>
              <Text style={styles.settingDescription}>
                Change your password
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Region Section */}
        <Text style={styles.sectionTitle}>Region</Text>

        <TouchableOpacity
          style={styles.themeButton}
          onPress={handleRegionChange}
        >
          <Text style={styles.themeButtonText}>
            Region: {getRegionDisplayText()}
          </Text>
        </TouchableOpacity>

        {/* Appearance Section */}
        <Text style={styles.sectionTitle}>Appearance</Text>

        <TouchableOpacity
          style={styles.themeButton}
          onPress={handleThemeChange}
        >
          <Text style={styles.themeButtonText}>
            Theme: {getThemeDisplayText()}
          </Text>
        </TouchableOpacity>

        {/* Notifications Section */}
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingText}>Push Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive notifications for event reminders
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{
              false: colors.separator || "#767577",
              true: colors.primary,
            }}
            thumbColor={colors.textPrimary || "#ffffff"}
          />
        </View>

        {/* App Info Section */}
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingText}>Version</Text>
            <Text style={styles.settingDescription}>Dev 0.1.3</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingText}>Build</Text>
            <Text style={styles.settingDescription}>2025.09.09</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingText}>Current Theme</Text>
            <Text style={styles.settingDescription}>
              {isDark ? "Dark Mode Active" : "Light Mode Active"}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
