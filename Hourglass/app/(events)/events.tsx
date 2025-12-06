import { View, StyleSheet } from "react-native";
import React from "react";
import HeaderEvents from "@/components/events/HeaderEvents";
import AllEventsScreen from "./all";

export default function EventsScreen() {
  return (
    <View style={styles.container}>
      {/* <HeaderEvents /> Adding in the future*/}
      <AllEventsScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // Ensures the View takes up the full screen
  },
});
