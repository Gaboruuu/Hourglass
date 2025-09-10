import React, {createContext, useContext, useState, useEffect} from "react";
import { useColorScheme} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors } from "../constants/Colors";

type ThemeType = "light" | "dark" | "system";
type ColorScheme = typeof Colors.light

interface ThemeContextType {
    theme: ThemeType;
    colors: ColorScheme;
    isDark: boolean;
    setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
    const systemColorScheme = useColorScheme() === "dark" ? "dark" : "light";
    const [theme, setThemeState] = useState<ThemeType>("system");

    const isDark = theme === 'dark' || (theme === 'system' && systemColorScheme === 'dark');

    const colors = isDark ? Colors.dark : Colors.light;
    
    useEffect(() => {
        loadTheme();
    }, []);

    const loadTheme = async () => {
        try {
            const savedTheme = await AsyncStorage.getItem('app-theme');
            if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
                setThemeState(savedTheme as ThemeType);
            }
        } catch (error) {
            console.error("Failed to load theme:", error);
        }
    };

    const setTheme = async (newTheme: ThemeType) => {
        try {
            await AsyncStorage.setItem('app-theme', newTheme);
            setThemeState(newTheme);
        } catch (error) {
            console.error("Failed to save theme:", error);
        }
    };

    return (
        <ThemeContext.Provider value={{theme, colors , isDark, setTheme}}>
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
}