import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

export default function MyEventsScreen() {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Events</Text>
    </View>
  );
}