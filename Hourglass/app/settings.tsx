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
  Modal,
  FlatList,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import { Picker } from "@react-native-picker/picker";
import { useRegionContext } from "@/context/RegionContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NotificationService } from "@/data/NotificationManager";
import { FilterManager } from "@/data/FilterManager";
import { useUser } from "@/context/UserContext";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useEvents } from "@/context/EventsContext";
import EventsDataManager from "@/data/EventsDataManager";

export default function SettingsScreen() {
  const { colors, isDark, isBlack, theme, setTheme } = useTheme();
  const { region, setRegion, availableRegions } = useRegionContext();
  const { user } = useUser();
  const navigation = useNavigation();
  const { forceRefresh } = useEvents();
  // App settings states
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Game selection modal states
  const [gameModalVisible, setGameModalVisible] = useState(false);
  const [availableGames, setAvailableGames] = useState<string[]>([]);
  const [selectedGames, setSelectedGames] = useState<string[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);

  // Game icon mapping
  const getGameIcon = (gameName: string): string => {
    const iconMap: { [key: string]: string } = {
      "Genshin Impact": "🏰",
      "Honkai Impact 3rd": "⚔️",
      "Honkai: Star Rail": "🚂",
      "Zenless Zone Zero": "🏙️",
      "Wuthering Waves": "🌊",
      "Punishing Gray Raven": "🤖",
    };
    return iconMap[gameName] || "🎮";
  };

  // Load notification preferences on component mount
  useEffect(() => {
    const loadNotificationPreference = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem(
          "notificationsEnabled",
        );
        setNotificationsEnabled(savedPreference === "true");

        // Configure notifications
        NotificationService.configureNotifications();
      } catch (error) {
        console.error("Error loading notification preference:", error);
      }
    };

    loadNotificationPreference();
    loadUserGamePreferences();
  }, []);

  const loadUserGamePreferences = async () => {
    try {
      const userGames = await FilterManager.getUserSelectedGames();
      setSelectedGames(userGames);
    } catch (error) {
      console.error("Error loading user game preferences:", error);
    }
  };

  const openGameSelectionModal = async () => {
    setLoadingGames(true);
    setGameModalVisible(true);
    try {
      const games = await FilterManager.getAvailableGames([]);
      setAvailableGames(games);
      const userGames = await FilterManager.getUserSelectedGames();
      setSelectedGames(userGames);
    } catch (error) {
      console.error("Error loading games:", error);
      Alert.alert("Error", "Failed to load games");
    } finally {
      setLoadingGames(false);
    }
  };

  const toggleGameSelection = (gameName: string) => {
    setSelectedGames((prev) => {
      if (prev.includes(gameName)) {
        return prev.filter((g) => g !== gameName);
      } else {
        return [...prev, gameName];
      }
    });
  };

  const saveGamePreferences = async () => {
    try {
      // Save the new preferences
      await FilterManager.saveUserGamePreferences(selectedGames);
      setGameModalVisible(false);

      // Cancel ALL notifications first to ensure clean state
      await NotificationService.cancelAllEventNotifications();

      // Reschedule notifications only for selected games (or all if none selected)
      await EventsDataManager.refreshNotifications();

      // Refresh EventsContext to apply the new game filter
      await forceRefresh();

      Alert.alert(
        "Success",
        selectedGames.length === 0
          ? "All games will be shown"
          : `Saved preferences for ${selectedGames.length} game${selectedGames.length > 1 ? "s" : ""}`,
      );
    } catch (error) {
      console.error("Error saving game preferences:", error);
      Alert.alert("Error", "Failed to save game preferences");
    }
  };

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
      borderWidth: 2,
      borderColor: colors.primary,
    },
    themeButtonText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: "600",
    },
    activeThemeButton: {
      backgroundColor: colors.primary + "20",
      borderColor: colors.primary,
    },
    inactiveThemeButton: {
      backgroundColor: colors.surface,
      borderColor: colors.outline,
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
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      backgroundColor: colors.background,
      borderRadius: 16,
      padding: 20,
      width: "90%",
      maxHeight: "80%",
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginBottom: 8,
      textAlign: "center",
    },
    modalDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 20,
      textAlign: "center",
    },
    gameItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      marginBottom: 10,
      borderRadius: 12,
      borderWidth: 2,
    },
    gameItemUnselected: {
      backgroundColor: colors.surface,
      borderColor: colors.outline,
    },
    gameItemSelected: {
      backgroundColor: colors.primary + "15",
      borderColor: colors.primary,
    },
    gameIconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 12,
    },
    gameIcon: {
      fontSize: 28,
    },
    gameName: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      flex: 1,
    },
    checkmark: {
      fontSize: 24,
      color: colors.primary,
    },
    modalActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 20,
    },
    modalButton: {
      flex: 1,
      padding: 15,
      borderRadius: 8,
      alignItems: "center",
    },
    cancelButton: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.outline,
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: "bold",
      color: colors.textPrimary,
    },
    saveButtonText: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#ffffff",
    },
    selectionCount: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      marginBottom: 12,
    },
  });

  const handleThemeChange = (
    newTheme: "light" | "dark" | "black" | "system",
  ) => {
    setTheme(newTheme);
  };

  const getThemeDisplayText = (themeType: string) => {
    switch (themeType) {
      case "light":
        return "☀️ Light Theme";
      case "dark":
        return "🌙 Dark Theme";
      case "black":
        return "⚫ Pure Black Theme";
      case "system":
        return "📱 System Theme";
      default:
        return "Unknown";
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
            [{ text: "OK" }],
          );
          return;
        }

        // Configure notifications
        NotificationService.configureNotifications();

        // Enable in unified state management
        await FilterManager.setGlobalNotificationEnabled(true);
      } else {
        // We're disabling notifications, cancel all scheduled ones
        await NotificationService.cancelAllEventNotifications();

        // Disable in unified state management
        await FilterManager.setGlobalNotificationEnabled(false);
      }

      // Update state
      setNotificationsEnabled(value);
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
        <Text style={styles.userName}>{user?.username || "@username"} </Text>

        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <TouchableOpacity>
              <Text style={styles.settingText}>
                {user?.username || "@username"}
              </Text>
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

        {/* My Games Section */}
        <Text style={styles.sectionTitle}>My Games</Text>

        <TouchableOpacity
          style={styles.button}
          onPress={openGameSelectionModal}
        >
          <Text style={styles.buttonText}>
            Manage Games (
            {selectedGames.length === 0 ? "All" : selectedGames.length})
          </Text>
        </TouchableOpacity>

        {/* Notifications Section */}
        <Text style={styles.sectionTitle}>Notifications</Text>

        <View style={styles.settingItem}>
          <TouchableOpacity
            onPress={() =>
              (navigation as any).navigate("NotificationPreferences")
            }
          >
            <Text style={styles.settingText}>Push Notifications</Text>
            <Text style={styles.settingDescription}>
              Receive notifications for event reminders
            </Text>
          </TouchableOpacity>
        </View>

        {/* Appearance Section */}
        <Text style={styles.sectionTitle}>Appearance</Text>

        {/* Theme Selection Buttons */}
        {["light", "dark", "black", "system"].map((themeOption) => (
          <TouchableOpacity
            key={themeOption}
            style={[
              styles.themeButton,
              theme === themeOption
                ? styles.activeThemeButton
                : styles.inactiveThemeButton,
            ]}
            onPress={() =>
              handleThemeChange(
                themeOption as "light" | "dark" | "black" | "system",
              )
            }
          >
            <Text style={styles.themeButtonText}>
              {getThemeDisplayText(themeOption)}
            </Text>
          </TouchableOpacity>
        ))}

        {/* App Info Section */}
        <Text style={styles.sectionTitle}>About</Text>

        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingText}>Version</Text>
            <Text style={styles.settingDescription}>Dev 0.1.6</Text>
          </View>
        </View>

        <View style={styles.settingItem}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingText}>Build</Text>
            <Text style={styles.settingDescription}>2025.12.05</Text>
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

      {/* Game Selection Modal */}
      <Modal
        visible={gameModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setGameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Select Your Games</Text>
            <Text style={styles.modalDescription}>
              Choose the games you play. Leave empty to show all games.
            </Text>

            {selectedGames.length > 0 && (
              <Text style={styles.selectionCount}>
                {selectedGames.length} game{selectedGames.length > 1 ? "s" : ""}{" "}
                selected
              </Text>
            )}

            {loadingGames ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <Text style={{ color: colors.textSecondary }}>
                  Loading games...
                </Text>
              </View>
            ) : (
              <FlatList
                data={availableGames}
                keyExtractor={(item) => item}
                renderItem={({ item: gameName }) => (
                  <TouchableOpacity
                    style={[
                      styles.gameItem,
                      selectedGames.includes(gameName)
                        ? styles.gameItemSelected
                        : styles.gameItemUnselected,
                    ]}
                    onPress={() => toggleGameSelection(gameName)}
                  >
                    <View style={styles.gameIconContainer}>
                      <Text style={styles.gameIcon}>
                        {getGameIcon(gameName)}
                      </Text>
                    </View>
                    <Text style={styles.gameName}>{gameName}</Text>
                    {selectedGames.includes(gameName) && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color={colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                )}
                style={{ maxHeight: 400 }}
              />
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setGameModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveGamePreferences}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
