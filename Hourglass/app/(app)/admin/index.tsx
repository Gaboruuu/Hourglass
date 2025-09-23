import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "@/context/ThemeContext";
import { useUser } from "@/context/UserContext";

export default function AdminScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const { user } = useUser();

  const styles = StyleSheet.create({
    container: { flex: 1, padding: 16, backgroundColor: colors.background },
    title: {
      fontSize: 28,
      fontWeight: "700",
      marginBottom: 16,
      color: colors.text,
    },
    subtitle: { color: colors.text, opacity: 0.7, marginBottom: 16 },
    grid: { gap: 12 },
    card: {
      padding: 16,
      borderRadius: 12,
      backgroundColor: colors.background === "#000000" ? "#111827" : "#f4f4f5",
      borderWidth: 1,
      borderColor: colors.background === "#000000" ? "#374151" : "#e4e4e7",
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: 4,
      color: colors.text,
    },
    cardSubtitle: { color: colors.text, opacity: 0.8 },
    disabled: { opacity: 0.6 },
  });

  const goTo = (screen: string) => () => navigation.navigate(screen);

  const isAdmin = !!user?.admin;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin</Text>
      {!isAdmin && (
        <Text style={styles.subtitle}>
          You are not an admin. You may not have access to these actions.
        </Text>
      )}
      <View style={styles.grid}>
        <Pressable
          style={[styles.card, !isAdmin && styles.disabled]}
          onPress={goTo("AddEvent")}
          disabled={!isAdmin}
        >
          <Text style={styles.cardTitle}>Add Event</Text>
          <Text style={styles.cardSubtitle}>Create a new event</Text>
        </Pressable>

        <Pressable
          style={[styles.card, styles.disabled]}
          onPress={goTo("AddGame")}
          disabled={true} // Disabled as all games are already added
        >
          <Text style={styles.cardTitle}>Add Game</Text>
          <Text style={styles.cardSubtitle}>
            Create a new game. (Disabled, all games are already added)
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
