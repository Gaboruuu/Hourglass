import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useUser } from "@/context/UserContext";
import { useTheme } from "@/context/ThemeContext";

export default function Footer() {
  const navigation = useNavigation();
  const { user, logout } = useUser();
  const { colors } = useTheme();

  const styles = StyleSheet.create({
  footer: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 10,
    backgroundColor: colors.footer,
    borderTopWidth: 1,
    borderTopColor: colors.background,
  },
  link: {
    color: colors.text,
    fontSize: 16,
  },
});

  return (
    <View style={styles.footer}>
      <TouchableOpacity onPress={() => navigation.navigate("Drawer", { screen: "Home" })}>
        <Text style={styles.link}>Home</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Drawer", { screen: "Permanent-events" })}>
        <Text style={styles.link}>Permanent Events</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Drawer", { screen: "Events" })}>
        <Text style={styles.link}>Events</Text>
      </TouchableOpacity>
      {user?.admin && (
        <TouchableOpacity onPress={() => navigation.navigate("Admin")}>
          <Text style={styles.link}>Admin</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

