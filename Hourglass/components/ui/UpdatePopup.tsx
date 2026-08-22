import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "@/context/ThemeContext";
import { getCurrentVersion, getVersionLabel } from "@/data/changelog";

const LAST_SEEN_VERSION_KEY = "lastSeenChangelogVersion";

/**
 * A brief, friendly popup shown once after the app updates to a new version.
 * Displays only the summary — not the full detailed changelog.
 */
export default function UpdatePopup() {
  const { colors } = useTheme();
  const [visible, setVisible] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  const currentVersion = getCurrentVersion();

  useEffect(() => {
    checkIfNewVersion();
  }, []);

  const checkIfNewVersion = async () => {
    try {
      const lastSeen = await AsyncStorage.getItem(LAST_SEEN_VERSION_KEY);
      if (lastSeen !== currentVersion.version) {
        setVisible(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    } catch (error) {
      console.error("Error checking changelog version:", error);
    }
  };

  const handleDismiss = async () => {
    try {
      await AsyncStorage.setItem(
        LAST_SEEN_VERSION_KEY,
        currentVersion.version,
      );
    } catch (error) {
      console.error("Error saving seen version:", error);
    }
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  };

  if (!visible) return null;

  const styles = StyleSheet.create({
    overlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 9999,
    },
    container: {
      backgroundColor: colors.background,
      borderRadius: 20,
      padding: 24,
      width: "85%",
      alignItems: "center",
      borderWidth: 1,
      borderColor: colors.primary + "40",
    },
    iconContainer: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.primary + "20",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    title: {
      fontSize: 20,
      fontWeight: "bold",
      color: colors.textPrimary,
      marginBottom: 4,
      textAlign: "center",
    },
    versionText: {
      fontSize: 14,
      color: colors.primary,
      fontWeight: "600",
      marginBottom: 12,
    },
    summary: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      marginBottom: 20,
      paddingHorizontal: 8,
    },
    button: {
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 32,
      borderRadius: 12,
      width: "100%",
      alignItems: "center",
    },
    buttonText: {
      color: "#ffffff",
      fontSize: 16,
      fontWeight: "bold",
    },
  });

  return (
    <Modal transparent visible={visible} animationType="none">
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <View style={styles.container}>
          <View style={styles.iconContainer}>
            <Ionicons name="sparkles" size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>{currentVersion.title}</Text>
          <Text style={styles.versionText}>{getVersionLabel()}</Text>
          <Text style={styles.summary}>{currentVersion.summary}</Text>
          <TouchableOpacity style={styles.button} onPress={handleDismiss}>
            <Text style={styles.buttonText}>Got it!</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

/**
 * Utility to check whether the user has seen the latest changelog.
 * Used by the Settings screen to show a notification dot.
 */
export async function hasUnseenUpdate(): Promise<boolean> {
  try {
    const lastSeen = await AsyncStorage.getItem(LAST_SEEN_VERSION_KEY);
    return lastSeen !== getCurrentVersion().version;
  } catch {
    return false;
  }
}

/**
 * Mark the current version as seen (called when user opens the full changelog modal).
 */
export async function markChangelogSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      LAST_SEEN_VERSION_KEY,
      getCurrentVersion().version,
    );
  } catch (error) {
    console.error("Error marking changelog as seen:", error);
  }
}
