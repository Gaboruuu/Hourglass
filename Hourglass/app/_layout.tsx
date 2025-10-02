import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import { View, StyleSheet } from "react-native";
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
import { RegionProvider } from "@/context/RegionContext";

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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar backgroundColor={colors.background} />
      <View style={styles.container}>
        <RootStack />
        <Footer />
      </View>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <UserProvider>
        <RegionProvider>
          <FilterProvider>
            <AppContent />
          </FilterProvider>
        </RegionProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
