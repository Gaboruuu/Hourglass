import React from 'react';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import AllEventsScreen from '@/app/all-events';
import MyEventsScreen from '@/app/my-events'; 
import { useTheme } from '@/context/ThemeContext';

const Tab = createMaterialTopTabNavigator();

export default function HeaderEvents() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: colors.header, elevation: 0, shadowOpacity: 0 },
        tabBarIndicatorStyle: { backgroundColor: colors.text, height: 3, borderRadius: 2 },
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.separator || colors.text,
        tabBarLabelStyle: { fontWeight: '700', textTransform: 'none' },
        swipeEnabled: true,
      }}
    >
      <Tab.Screen name="All Events" component={AllEventsScreen} />
      <Tab.Screen name="My Events" component={MyEventsScreen} />
    </Tab.Navigator>
  );
}