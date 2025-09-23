import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { createDrawerNavigator } from "@react-navigation/drawer";
import { createStackNavigator } from "@react-navigation/stack";
import { View, StyleSheet } from "react-native";
import HomeScreen from "./(app)/home";
import SettingsScreen from "./(app)/settings";
import EventsScreen from "./(app)/events/events";
import CurrentEvents from "./(app)/events/current";
import Footer from "@/src/components/layout/Footer";
import { UserProvider, useUser } from "@/context/UserContext";
import { FilterProvider } from "@/context/FilterContext";
import CustomDrawerContent from "@/src/components/layout/CustomDrawerContent";
import AdminScreen from "./(app)/admin";
import MyEventsScreen from "./(app)/events/mine";
import AllEventsScreen from "./(app)/events/all";
import LoginScreen from "./(auth)/login";
import PermanentEventsScreen from "./permanent-events";
import { ThemeProvider } from "@/context/ThemeContext";
import { useTheme } from "@/context/ThemeContext";
import { StatusBar } from "expo-status-bar";
import AddGameScreen from "./(app)/games/add";
import AddEventScreen from "./(app)/events/add";

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
    </Drawer.Navigator>
  );
}

function RootStack() {
  return (
    <Stack.Navigator>
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
      <StatusBar
        backgroundColor={colors.background}
        //style={colors.background === "dark" ? "light" : "dark"}
      />
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
        <FilterProvider>
          <AppContent />
        </FilterProvider>
      </UserProvider>
    </ThemeProvider>
  );
}
