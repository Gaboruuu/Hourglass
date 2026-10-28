import { View, Text, Button, Alert, StyleSheet } from "react-native";
import React from "react";
import { TextInput } from "react-native-gesture-handler";
import { useUser } from "@/context/UserContext";
import { useTheme } from "@/context/ThemeContext";
import { describeApiError } from "@/data/api";

export default function LoginScreen() {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const { login } = useUser();
  const { colors } = useTheme();

  const handleLogin = async () => {
    setError(null);
    if (!username || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setIsLoading(true);
    try {
      const user = await login(username.trim(), password);
      setPassword("");
      Alert.alert("Login Successful", `Welcome back! ${user.username}`);
    } catch (error) {
      // The server sends one generic message for a wrong username or password
      setError(describeApiError(error));
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      padding: 24,
      flex: 1,
      justifyContent: "center",
      backgroundColor: colors.background,
    },
    title: {
      fontSize: 28,
      fontWeight: "bold",
      marginBottom: 24,
      textAlign: "center",
      color: colors.textPrimary,
    },
    input: {
      borderWidth: 1,
      borderColor: "#bbb",
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      fontSize: 16,
      color: colors.textPrimary,
    },
    error: {
      color: colors.error,
      backgroundColor: colors.background,
      padding: 10,
      borderRadius: 6,
      marginBottom: 12,
      textAlign: "center",
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <TextInput
        placeholder="Username"
        placeholderTextColor={colors.placeholder}
        value={username}
        onChangeText={setUsername}
        style={styles.input}
        autoCapitalize="none"
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor={colors.placeholder}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
        autoCapitalize="none"
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <Button
        color={colors.primary}
        title="Login"
        onPress={handleLogin}
        disabled={isLoading}
      />
    </View>
  );
}
