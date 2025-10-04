import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useTheme } from "@/context/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NotificationService } from "@/data/NotificationManager";
import NotificationInitializer from "@/data/NotificationInitializer";

interface NotificationOptInDialogProps {
  isVisible: boolean;
  onClose: () => void;
  onNotificationPreferenceSet: (enabled: boolean) => void;
}

export default function NotificationOptInDialog({
  isVisible,
  onClose,
  onNotificationPreferenceSet,
}: NotificationOptInDialogProps) {
  const { colors } = useTheme();
  const screenWidth = Dimensions.get("window").width;

  console.log("Dialog visible state:", isVisible);

  const styles = StyleSheet.create({
    overlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    modalView: {
      width: screenWidth * 0.85,
      maxWidth: 400,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      alignItems: "center",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 8,
    },
    title: {
      fontSize: 22,
      fontWeight: "bold",
      marginBottom: 16,
      color: colors.textPrimary,
      textAlign: "center",
    },
    description: {
      fontSize: 16,
      color: colors.textSecondary,
      marginBottom: 24,
      textAlign: "center",
      lineHeight: 22,
    },
    buttonsContainer: {
      flexDirection: "row",
      width: "100%",
      justifyContent: "space-between",
      marginTop: 20,
    },
    button: {
      borderRadius: 8,
      padding: 16,
      //   elevation: 2,
      flex: 1,
      marginHorizontal: 8,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 54,
    },
    buttonNo: {
      backgroundColor: "transparent",
      borderWidth: 1,
    },
    buttonYes: {
      backgroundColor: colors.primary,
    },
    textNo: {
      color: colors.textPrimary,
      fontWeight: "600",
      fontSize: 16,
    },
    textYes: {
      color: "#FFFFFF",
      fontWeight: "600",
      fontSize: 16,
    },
  });

  const handleEnableNotifications = async () => {
    console.log("User enabling notifications");
    try {
      const hasPermission = await NotificationService.requestPermissions();
      if (hasPermission) {
        await AsyncStorage.setItem("notificationsEnabled", "true");
        onNotificationPreferenceSet(true);

        // Initialize all notifications immediately when user enables them
        await NotificationInitializer.initializeAllNotifications();
      } else {
        await AsyncStorage.setItem("notificationsEnabled", "false");
        onNotificationPreferenceSet(false);
      }
    } catch (error) {
      console.error("Error enabling notifications:", error);
    }
    onClose();
  };

  const handleDeclineNotifications = async () => {
    console.log("User declining notifications");
    try {
      await AsyncStorage.setItem("notificationsEnabled", "false");
      onNotificationPreferenceSet(false);
    } catch (error) {
      console.error("Error saving notification preference:", error);
    }
    onClose();
  };

  // If not visible, don't render anything
  if (!isVisible) return null;

  // Use hardcoded colors for maximum compatibility
  return (
    <View style={styles.overlay}>
      <View style={styles.modalView}>
        <Text style={styles.title}>Stay Updated with Events</Text>
        <Text style={styles.description}>
          Would you like to receive notifications when events are about to
          expire? We'll notify you 3 days, 1 day, and 2 hours before events end
          so you never miss out.
        </Text>

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.buttonNo]}
            onPress={handleDeclineNotifications}
            activeOpacity={0.7}
          >
            <Text style={styles.textNo}>No Thanks</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonYes]}
            onPress={handleEnableNotifications}
            activeOpacity={0.7}
          >
            <Text style={styles.textYes}>Enable</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
