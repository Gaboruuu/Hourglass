import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useUser } from "@/context/UserContext";
import { useTheme } from "@/context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { BlurView } from "expo-blur";

const AnimatedTouchableOpacity =
  Animated.createAnimatedComponent(TouchableOpacity);

interface FooterButtonProps {
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  isActive?: boolean;
  color?: string;
}

function FooterButton({
  iconName,
  onPress,
  isActive = false,
  color,
}: FooterButtonProps) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }, { translateY: translateY.value }],
    };
  });

  const handlePressIn = () => {
    scale.value = withSpring(0.9);
    translateY.value = withSpring(-2);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
    translateY.value = withSpring(0);
  };

  const styles = StyleSheet.create({
    iconButton: {
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      paddingVertical: 0,
      paddingHorizontal: 10,
      borderRadius: 16,
      minWidth: 100,
      backgroundColor: isActive ? colors.primary + "20" : "transparent",
    },
  });

  return (
    <AnimatedTouchableOpacity
      style={[styles.iconButton, animatedStyle]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Ionicons
        name={iconName}
        size={26}
        color={color || (isActive ? colors.primary : colors.textSecondary)}
      />
    </AnimatedTouchableOpacity>
  );
}

export default function Footer() {
  const navigation = useNavigation();
  const { user } = useUser();
  const { colors, isDark, isBlack } = useTheme();
  const [activeTab, setActiveTab] = useState("home");
  const [shouldShowFooter, setShouldShowFooter] = useState(true);

  const resolveCurrentRouteName = (state: any): string => {
    if (!state || !state.routes || state.routes.length === 0) {
      return "";
    }

    const currentRoute = state.routes[state.index ?? 0];

    if (currentRoute.state) {
      const nestedRouteName = resolveCurrentRouteName(currentRoute.state);
      if (nestedRouteName) {
        return nestedRouteName;
      }
    }

    if (currentRoute.name === "Drawer") {
      return "Home";
    }

    return currentRoute.name;
  };

  // Sync footer state with actual current route
  useEffect(() => {
    // Map routes to footer tabs
    const routeToTabMap: { [key: string]: string } = {
      Home: "home",
      "Permanent-events": "permanent",
      Events: "events",
    };

    // List of routes that should show the footer
    const footerVisibleRoutes = ["Home", "Permanent-events", "Events"];

    // Function to update footer state based on navigation
    const updateFooterState = () => {
      try {
        const state = (navigation as any).getState();
        const currentRouteName = resolveCurrentRouteName(state);

        if (!currentRouteName) {
          return;
        }

        // Update active tab based on current route
        if (routeToTabMap[currentRouteName]) {
          setActiveTab(routeToTabMap[currentRouteName]);
        }

        // Show/hide footer based on current route
        setShouldShowFooter(footerVisibleRoutes.includes(currentRouteName));
      } catch (error) {
        // Navigation state might not be available yet
      }
    };

    // Check the state when effect runs
    updateFooterState();

    // Subscribe to navigation state changes
    const unsubscribe = (navigation as any).addListener(
      "state",
      updateFooterState,
    );

    return () => {
      unsubscribe?.();
    };
  }, [navigation]);

  const handleNavigation = (
    route: string,
    screen?: string,
    tabName?: string,
  ) => {
    if (tabName) setActiveTab(tabName);
    if (screen) {
      (navigation as any).navigate(route, { screen });
    } else {
      (navigation as any).navigate(route);
    }
  };

  // Don't render footer if not on footer-visible routes
  if (!shouldShowFooter) {
    return null;
  }

  const getFooterBackground = () => {
    if (isBlack) return "rgba(17, 17, 17, 0.98)";
    if (isDark) return "rgba(30, 41, 59, 0.95)";
    return "rgba(255, 255, 255, 0.95)";
  };

  const getBorderColor = () => {
    if (isBlack) return "rgba(255, 255, 255, 0.05)";
    if (isDark) return "rgba(255, 255, 255, 0.1)";
    return "rgba(0, 0, 0, 0.1)";
  };

  const getBlurTint = () => {
    if (isBlack) return "dark";
    if (isDark) return "dark";
    return "light";
  };

  const styles = StyleSheet.create({
    footer: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 20,
      backgroundColor: getFooterBackground(),
      borderTopWidth: 1,
      borderTopColor: getBorderColor(),
      shadowColor: colors.textPrimary,
      shadowOffset: {
        width: 0,
        height: -4,
      },
      shadowOpacity: isBlack ? 0.4 : 0.15,
      shadowRadius: 12,
      elevation: 20,
    },
    blurContainer: {
      overflow: "hidden",
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
    },
    contentContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingVertical: 0,
      paddingHorizontal: 20,
    },
  });

  return (
    <View style={styles.blurContainer}>
      <BlurView
        intensity={isBlack ? 30 : 20}
        tint={getBlurTint()}
        style={styles.footer}
      >
        <View style={styles.contentContainer}>
          <FooterButton
            iconName="home"
            onPress={() => handleNavigation("Drawer", "Home", "home")}
            isActive={activeTab === "home"}
          />

          <FooterButton
            iconName="calendar"
            onPress={() =>
              handleNavigation("Drawer", "Permanent-events", "permanent")
            }
            isActive={activeTab === "permanent"}
          />

          <FooterButton
            iconName="time"
            onPress={() => handleNavigation("Drawer", "Events", "events")}
            isActive={activeTab === "events"}
          />
        </View>
      </BlurView>
    </View>
  );
}
