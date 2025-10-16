import React, { createContext, useContext, useState, useEffect } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Colors } from "../theme/Colors";

type ThemeType = "light" | "dark" | "black" | "system";
type ColorScheme = typeof Colors.light;

interface ThemeContextType {
  theme: ThemeType;
  colors: ColorScheme;
  isDark: boolean;
  isBlack: boolean;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme() === "dark" ? "dark" : "light";
  const [theme, setThemeState] = useState<ThemeType>("system");

  const isDark =
    theme === "dark" ||
    theme === "black" ||
    (theme === "system" && systemColorScheme === "dark");

  const isBlack = theme === "black";

  const getColors = () => {
    if (theme === "black") return Colors.black;
    if (theme === "dark") return Colors.dark;
    if (theme === "light") return Colors.light;
    // System theme
    return systemColorScheme === "dark" ? Colors.dark : Colors.light;
  };

  const colors = getColors();

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("app-theme");
      if (
        savedTheme &&
        ["light", "dark", "black", "system"].includes(savedTheme)
      ) {
        setThemeState(savedTheme as ThemeType);
      }
    } catch (error) {
      console.error("Failed to load theme:", error);
    }
  };

  const setTheme = async (newTheme: ThemeType) => {
    try {
      await AsyncStorage.setItem("app-theme", newTheme);
      setThemeState(newTheme);
    } catch (error) {
      console.error("Failed to save theme:", error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, colors, isDark, isBlack, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
