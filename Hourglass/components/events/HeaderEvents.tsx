import React from "react";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
import AllEventsScreen from "@/app/(events)/all";
import MyEventsScreen from "@/app/(events)/mine";
import { useTheme } from "@/context/ThemeContext";

const Tab = createMaterialTopTabNavigator();

export default function HeaderEvents() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: colors.surface,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarIndicatorStyle: {
          backgroundColor: colors.primary,
          height: 3,
          borderRadius: 2,
        },
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.separator || colors.textPrimary,
        tabBarLabelStyle: { fontWeight: "700", textTransform: "none" },
        swipeEnabled: true,
      }}
    >
      <Tab.Screen name="All Events" component={AllEventsScreen} />
      <Tab.Screen name="My Events" component={MyEventsScreen} />
    </Tab.Navigator>
  );
}
