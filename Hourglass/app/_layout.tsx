import React, { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useTheme, ThemeProvider } from "@/context/ThemeContext";
import { UserProvider, useUser } from "@/context/UserContext";
import { FilterProvider } from "@/context/FilterContext";
import Footer from "@/components/layout/Footer";
import CustomDrawerContent from "@/components/layout/CustomDrawerContent";
import HomeScreen from "@/app/home";
import SettingsScreen from "@/app/settings";
import EventsScreen from "@/app/(events)/events";
import PermanentEventsScreen from "@/app/(events)/permanent";
import LoginScreen from "@/app/(auth)/login";
import CurrentEvents from "@/app/(events)/current";
import AdminScreen from "@/app/(admin)/admin";
import MyEventsScreen from "@/app/(events)/mine";
import AllEventsScreen from "@/app/(events)/all";
import AddGameScreen from "@/app/(admin)/add-game";
import AddEventScreen from "@/app/(admin)/add-event";
import { useRouter } from "expo-router";
import { RegionProvider, useRegionContext } from "@/context/RegionContext";
import NotificationOptInDialog from "@/components/ui/NotificationOpt";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NotificationInitializer from "@/data/NotificationInitializer";
import * as SplashScreen from "expo-splash-screen";
import { AppState, AppStateStatus } from "react-native";
import NotificationService from "@/data/NotificationManager";

// Prevent auto-hiding splash screen
SplashScreen.preventAutoHideAsync();

const Drawer = createDrawerNavigator();
const Stack = createStackNavigator();

function DrawerNavigator() {
  const { user } = useUser();
  const { colors } = useTheme();

  return (
    <Drawer.Navigator
      initialRouteName="Home"
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        swipeEdgeWidth: 80,
        headerStyle: {
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.textPrimary,
        drawerInactiveTintColor: colors.textPrimary,
        drawerActiveTintColor: colors.primary,
      }}
    >
      <Drawer.Screen name="Home" component={HomeScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="Events" component={EventsScreen} />
      <Drawer.Screen
        name="Permanent-events"
        component={PermanentEventsScreen}
      />
      {!user && <Drawer.Screen name="Login" component={LoginScreen} />}
      {user?.admin && <Drawer.Screen name="Admin" component={AdminScreen} />}
    </Drawer.Navigator>
  );
}

function RootStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.textPrimary,
      }}
    >
      {/* Drawer Navigator */}
      <Stack.Screen
        name="Drawer"
        component={DrawerNavigator}
        options={{ headerShown: false }}
      />
      {/* Non-Drawer Screens */}
      <Stack.Screen name="CurrentEvents" component={CurrentEvents} />
      <Stack.Screen name="Admin" component={AdminScreen} />
      <Stack.Screen name="MyEvents" component={MyEventsScreen} />
      <Stack.Screen name="AllEvents" component={AllEventsScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="AddGame" component={AddGameScreen} />
      <Stack.Screen name="AddEvent" component={AddEventScreen} />
    </Stack.Navigator>
  );
}

function AppContent() {
  const { colors } = useTheme();
  const { isLoading: userLoading } = useUser();
  const [showNotificationDialog, setShowNotificationDialog] = useState(false);
  const [appIsReady, setAppIsReady] = useState(false);
  const regionContext = useRegionContext();

  // Initialize app and notifications
  useEffect(() => {
    async function prepare() {
      try {
        console.log("Initializing app...");

        // FOR TESTING: Reset storage during development
        // IMPORTANT: Comment this out for production!
        // await AsyncStorage.removeItem("notificationsEnabled");
        // await AsyncStorage.removeItem("hasShownNotificationDialog");
        // await NotificationService.cancelAllEventNotifications();
        // console.log("Storage cleared for testing");

        // Check if notification preference has been set before
        const notificationPreference = await AsyncStorage.getItem(
          "notificationsEnabled"
        );
        const hasShownDialog = await AsyncStorage.getItem(
          "hasShownNotificationDialog"
        );

        console.log("Notification preference:", notificationPreference);
        console.log("Has shown dialog:", hasShownDialog);

        // Initialize notifications if enabled
        if (notificationPreference === "true") {
          console.log("Initializing notifications at app startup...");
          await NotificationInitializer.initializeAllNotifications();
        }

        // If notification preference hasn't been set and dialog hasn't been shown yet
        if (notificationPreference === null && hasShownDialog !== "true") {
          console.log("Should show notification dialog");
          setShowNotificationDialog(true);
        }
      } catch (error) {
        console.error("Error during initialization:", error);
      } finally {
        // Mark app as ready and hide splash screen
        setAppIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  // Refresh notifications when region changes
  useEffect(() => {
    // Keep track of the region to detect actual changes
    const refreshNotificationsForRegion = async () => {
      // Store current region to avoid unnecessary refreshes
      const previousRegion = await AsyncStorage.getItem(
        "lastNotificationRegion"
      );
      const currentRegion = regionContext.region;

      if (previousRegion === currentRegion) {
        console.log("Region unchanged, skipping notification refresh");
        return;
      }

      const notificationsEnabled = await AsyncStorage.getItem(
        "notificationsEnabled"
      );

      if (notificationsEnabled === "true" && appIsReady) {
        console.log(
          `Region changed from ${
            previousRegion || "initial"
          } to ${currentRegion}, refreshing notifications...`
        );
        await NotificationInitializer.refreshAllNotifications();

        // Save current region after successful refresh
        await AsyncStorage.setItem("lastNotificationRegion", currentRegion);
      }
    };

    if (appIsReady) {
      refreshNotificationsForRegion();
    }
  }, [regionContext.region, appIsReady]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    // Track previous app state to avoid duplicate "active" triggers
    let prevAppState = AppState.currentState;

    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Only refresh when transitioning from background to active state
      // This avoids extra refreshes when the app is just momentarily inactive
      if (
        prevAppState.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        const notificationsEnabled = await AsyncStorage.getItem(
          "notificationsEnabled"
        );

        if (notificationsEnabled === "true") {
          // When app comes to foreground from background, check if we need to refresh
          console.log(
            "App came to foreground, checking if notifications need refresh..."
          );

          // This will only refresh if it's been more than 1 hour since last refresh
          await NotificationInitializer.refreshAllNotifications();
        }
      }

      prevAppState = nextAppState;
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const handleDialogClose = async () => {
    // Now mark the dialog as shown when it's closed by user interaction
    await AsyncStorage.setItem("hasShownNotificationDialog", "true");
    setShowNotificationDialog(false);
    console.log("Dialog closed and marked as shown");
  };

  const handleNotificationPreferenceSet = (enabled: boolean) => {
    console.log("User set notification preference:", enabled);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    rootContainer: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: colors.background,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: colors.textPrimary,
    },
  });

  // Show loading screen while checking authentication
  if (userLoading || !appIsReady) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.rootContainer}>
      <StatusBar backgroundColor={colors.background} />
      <View style={styles.container}>
        <RootStack />
        <Footer />
      </View>
      <NotificationOptInDialog
        isVisible={showNotificationDialog}
        onClose={handleDialogClose}
        onNotificationPreferenceSet={handleNotificationPreferenceSet}
      />
    </View>
  );
}

// Component to sync permanentEventsManager with RegionContext
function RegionSync({ children }: { children: React.ReactNode }) {
  const regionContext = useRegionContext();

  useEffect(() => {
    // Import here to avoid circular dependency
    const permanentEventsManager =
      require("@/data/permanentEvents/PermanentEventsManager").default;

    // Sync permanent events manager with region context
    permanentEventsManager.syncWithRegionContext(regionContext);

    console.log(
      "Synced permanentEventsManager with RegionContext:",
      regionContext.region
    );
  }, [regionContext.region]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <UserProvider>
          <RegionProvider>
            <RegionSync>
              <FilterProvider>
                <AppContent />
              </FilterProvider>
            </RegionSync>
          </RegionProvider>
        </UserProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
