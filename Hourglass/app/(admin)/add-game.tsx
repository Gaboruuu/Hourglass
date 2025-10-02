import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import React, { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { TextInput } from "react-native-gesture-handler";

export default function AddGameScreen() {
  const { colors } = useTheme();
  const [gameName, setGameName] = useState("");

  const handleAddGame = async () => {
    if (gameName.trim() === "") {
      alert("Please enter a game name.");
      return;
    }

    const success = await addGame(gameName.trim());
    if (success) {
      alert(`Game "${gameName}" added successfully!`);
    }
  };

  const addGame = async (name: string) => {
    try {
      // Check if API is accessible
      const baseUrl = "https://hourglass-h6zo.onrender.com/api/games";

      // First verify the game doesn't exist
      const response = await fetch(baseUrl);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const games = await response.json();
      console.log("Fetched games from the database:", games);

      // Check for duplicate games
      if (games && Array.isArray(games)) {
        const existingGame = games.find(
          (g) => g && g.name && g.name.toLowerCase() === name.toLowerCase()
        );

        if (existingGame) {
          alert("This game already exists in the database.");
          return;
        }
      }

      // Add the new game
      const addResponse = await fetch(baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });

      if (!addResponse.ok) {
        throw new Error(`Failed to add game: ${addResponse.status}`);
      }

      console.log("Game added successfully");
      setGameName("");
      return true;
    } catch (error: any) {
      console.error("Error adding game:", error);
      alert(`Error: ${error.message || "Failed to connect to the server"}`);
      return false;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      padding: 24,
    },
    headerContainer: {
      marginBottom: 32,
    },
    title: {
      fontSize: 28,
      fontWeight: "700",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textPrimary,
      opacity: 0.7,
    },
    formContainer: {
      gap: 24,
    },
    inputGroup: {
      gap: 8,
    },
    label: {
      fontSize: 16,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 4,
    },
    input: {
      backgroundColor: colors.surface, // Using header color as a card background
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      color: colors.textPrimary,
      fontSize: 16,
      borderWidth: 1,
      borderColor: colors.separator,
    },
    helpText: {
      color: colors.textPrimary,
      fontSize: 14,
      opacity: 0.6,
      marginTop: 4,
    },
    buttonContainer: {
      marginTop: 32,
    },
    addButton: {
      backgroundColor: "#007bff", // Using a fixed primary color
      borderRadius: 12,
      paddingVertical: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Add New Game</Text>
          <Text style={styles.subtitle}>
            Enter the details of the game you want to add
          </Text>
        </View>

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Game Name</Text>
            <TextInput
              placeholder="Enter game name"
              placeholderTextColor={`${colors.textPrimary}80`}
              style={styles.input}
              value={gameName}
              onChangeText={setGameName}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddGame}
              activeOpacity={0.8}
            >
              <Text style={styles.buttonText}>Add Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
