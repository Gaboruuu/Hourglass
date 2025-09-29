import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import React, { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import {
  TextInput,
  ScrollView,
  TouchableOpacity,
} from "react-native-gesture-handler";
import { Picker } from "@react-native-picker/picker";
import { Switch } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

interface Game {
  game_id: number;
  game_title: string;
}

type DateTimePickerEvent = {
  type: string;
  nativeEvent: {
    timestamp?: number;
  };
};

export default function AddEventScreen() {
  const { colors } = useTheme();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [eventName, setEventName] = useState("");
  const [selectedGameId, setSelectedGameId] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [expireDate, setExpireDate] = useState(new Date());
  const [dailyLogin, setDailyLogin] = useState(false);
  const [importance, setImportance] = useState("side"); // Default to side

  // Date picker state
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showExpireDatePicker, setShowExpireDatePicker] = useState(false);

  // Fetch games from API
  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        "https://hourglass-h6zo.onrender.com/api/games"
      );
      if (!response.ok) {
        throw new Error("Failed to fetch games");
      }
      const data = await response.json();
      setGames(data);
      if (data.length > 0) {
        setSelectedGameId(data[0].game_id.toString());
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message || "Unknown error occurred");
      setLoading(false);
      Alert.alert("Error", "Failed to load games");
    }
  };

  const handleStartDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    const currentDate = selectedDate || startDate;
    setShowStartDatePicker(Platform.OS === "ios");
    setStartDate(currentDate);
  };

  const handleExpireDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    const currentDate = selectedDate || expireDate;
    setShowExpireDatePicker(Platform.OS === "ios");
    setExpireDate(currentDate);
  };

  const formatDateForDisplay = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const handleSubmit = async () => {
    // Validate form
    if (!eventName.trim()) {
      Alert.alert("Error", "Event name is required");
      return;
    }

    if (!selectedGameId) {
      Alert.alert("Error", "Please select a game");
      return;
    }

    if (startDate >= expireDate) {
      Alert.alert("Error", "Expire date must be after start date");
      return;
    }

    // Prepare event data
    const eventData = {
      game_id: parseInt(selectedGameId),
      event_name: eventName,
      start_date: formatDateForDisplay(startDate),
      expire_date: formatDateForDisplay(expireDate),
      daily_login: dailyLogin,
      importance: importance,
    };

    try {
      const response = await fetch(
        "https://hourglass-h6zo.onrender.com/api/events",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(eventData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add event");
      }

      Alert.alert("Success", "Event added successfully");
      // Reset form
      setEventName("");
      setSelectedGameId(games.length > 0 ? games[0].game_id.toString() : "");
      setStartDate(new Date());
      setExpireDate(new Date());
      setDailyLogin(false);
      setImportance("side");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to add event");
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: 20,
    },
    scrollContainer: {
      paddingBottom: 40,
    },
    header: {
      color: colors.textPrimary,
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 20,
      textAlign: "center",
    },
    formContainer: {
      backgroundColor: colors.surface,
      borderRadius: 10,
      padding: 20,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      marginBottom: 20,
    },
    formGroup: {
      marginBottom: 20,
    },
    label: {
      color: colors.textPrimary,
      fontSize: 16,
      marginBottom: 8,
      fontWeight: "500",
    },
    input: {
      backgroundColor: colors.surfaceVariant,
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: 5,
      padding: 12,
      color: colors.textPrimary,
      fontSize: 16,
    },
    pickerContainer: {
      backgroundColor: colors.surfaceVariant,
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: 5,
      overflow: "hidden",
    },
    picker: {
      color: colors.textPrimary,
      backgroundColor: colors.surfaceVariant,
      height: 50,
    },
    switchRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
    },
    dateButton: {
      backgroundColor: colors.surfaceVariant,
      borderWidth: 1,
      borderColor: colors.outline,
      borderRadius: 5,
      padding: 12,
      alignItems: "center",
    },
    dateButtonText: {
      color: colors.textPrimary,
      fontSize: 16,
    },
    radioContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 10,
    },
    radioOption: {
      flexDirection: "row",
      alignItems: "center",
    },
    radioCircle: {
      height: 20,
      width: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10,
    },
    selectedRadio: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.primary,
    },
    radioLabel: {
      color: colors.textPrimary,
      fontSize: 16,
    },
    submitButton: {
      backgroundColor: colors.primary,
      padding: 15,
      borderRadius: 5,
      alignItems: "center",
      marginTop: 20,
    },
    submitButtonText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "bold",
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.textPrimary, marginTop: 20 }}>
          Loading games...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={{ color: colors.error, textAlign: "center" }}>
          {error}
        </Text>
        <TouchableOpacity
          style={[styles.submitButton, { marginTop: 20 }]}
          onPress={fetchGames}
        >
          <Text style={styles.submitButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContainer}
    >
      <Text style={styles.header}>Add New Event</Text>

      <View style={styles.formContainer}>
        {/* Game Selection */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Game</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedGameId}
              onValueChange={(itemValue) => setSelectedGameId(itemValue)}
              style={styles.picker}
            >
              {games.map((game) => (
                <Picker.Item
                  key={game.game_id}
                  label={game.game_title}
                  value={game.game_id.toString()}
                />
              ))}
            </Picker>
          </View>
        </View>

        {/* Event Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Event Name</Text>
          <TextInput
            placeholder="Enter event name"
            placeholderTextColor={colors.textSecondary}
            value={eventName}
            onChangeText={setEventName}
            style={styles.input}
          />
        </View>

        {/* Start Date */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {formatDateForDisplay(startDate)}
            </Text>
          </TouchableOpacity>
          {showStartDatePicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display="default"
              onChange={handleStartDateChange}
            />
          )}
        </View>

        {/* Expire Date */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Expire Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowExpireDatePicker(true)}
          >
            <Text style={styles.dateButtonText}>
              {formatDateForDisplay(expireDate)}
            </Text>
          </TouchableOpacity>
          {showExpireDatePicker && (
            <DateTimePicker
              value={expireDate}
              mode="date"
              display="default"
              onChange={handleExpireDateChange}
            />
          )}
        </View>

        {/* Daily Login */}
        <View style={styles.formGroup}>
          <View style={styles.switchRow}>
            <Text style={styles.label}>Daily Login</Text>
            <Switch
              trackColor={{ false: "#767577", true: `${colors.primary}88` }}
              thumbColor={dailyLogin ? colors.primary : "#f4f3f4"}
              ios_backgroundColor="#3e3e3e"
              onValueChange={() => setDailyLogin(!dailyLogin)}
              value={dailyLogin}
            />
          </View>
        </View>

        {/* Importance */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Importance</Text>
          <View style={styles.radioContainer}>
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setImportance("main")}
            >
              <View style={styles.radioCircle}>
                {importance === "main" && <View style={styles.selectedRadio} />}
              </View>
              <Text style={styles.radioLabel}>Main</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setImportance("side")}
            >
              <View style={styles.radioCircle}>
                {importance === "side" && <View style={styles.selectedRadio} />}
              </View>
              <Text style={styles.radioLabel}>Side</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Add Event</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
