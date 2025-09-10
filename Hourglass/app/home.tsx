import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/context/ThemeContext";

export default function HomeScreen() {
  const { colors } = useTheme();

  const styles = StyleSheet.create({
    container: {
      flex: 1,

      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    text: {
      color: colors.text,
      fontSize: 18,
      fontWeight: 'bold',
    },

    secondaryText: {
      color: colors.separator,
      fontSize: 14,
    },

  });

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Welcome to Hourglass!</Text>
      <Text style={styles.secondaryText}>This app is currently in development.</Text>
    </View>
  );
}
