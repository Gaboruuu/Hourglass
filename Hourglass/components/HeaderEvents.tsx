import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import AllEventsScreen from '@/app/all-events';
import MyEventsScreen from '@/app/my-events'; 

const Tab = createBottomTabNavigator();

export default function HeaderEvents() {
  return (
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: { backgroundColor: '#f8f9fa' },
          tabBarActiveTintColor: '#007bff',
          tabBarInactiveTintColor: '#666',
          tabBarLabelStyle: { fontWeight: 'bold' },
        }}
      >
        <Tab.Screen name="All Events" component={AllEventsScreen} />
        <Tab.Screen name="My Events" component={MyEventsScreen} />
      </Tab.Navigator>
  );
}