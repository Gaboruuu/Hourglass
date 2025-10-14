/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

export const Colors = {
  light: {
    background: "#ffffffff", // App background
    surface: "#ffffffff", // Cards, sheets, menus
    surfaceVariant: "#f5f5f5ff", // Slightly darker than surface for contrast
    separator: "#171515ff", // Dividers, lines
    outline: "#d0d0d0ff", // Borders, strokes

    primary: "#bb86fcff", // Brand / accent (same hue as dark)
    onPrimary: "#000000ff", // Text/icons on primary
    secondary: "#03dac6ff", // Secondary accent
    onSecondary: "#000000ff", // Text/icons on secondary
    error: "#b00020ff", // Errors, alerts (light-theme standard)
    onError: "#ffffffff", // Text/icons on error

    textPrimary: "#000000ff", // Main readable text
    textSecondary: "#5c5c5cff", // Subtext, descriptions
    placeholder: "#999999ff", // Placeholder text color
    disabled: "#bdbdbdff", // Disabled text/icons
    inverseSurface: "#121212ff", // For dark overlays / toasts
    inverseOnSurface: "#ffffffff", // Text/icons on inverse
  },
  dark: {
    background: "#000000ff", // App background
    surface: "#121212ff", // Cards, sheets, menus
    surfaceVariant: "#1e1e1eff", // Slightly lighter for contrast
    separator: "#d0c9c9ff", // Dividers, lines
    outline: "#444444ff", // Borders, strokes

    primary: "#bb86fcff", // Brand / accent color
    onPrimary: "#000000ff", // Text/icons on primary
    secondary: "#03dac6ff", // Secondary accent
    onSecondary: "#000000ff", // Text/icons on secondary
    error: "#cf6679ff", // Errors, alerts
    onError: "#000000ff", // Text/icons on error

    textPrimary: "#ffffffff", // Main readable text
    textSecondary: "#b3b3b3ff", // Subtext, descriptions
    placeholder: "#888888ff", // Placeholder text color
    disabled: "#666666ff", // Disabled text/icons
    inverseSurface: "#ffffff", // Light overlays
    inverseOnSurface: "#000000", // Text/icons on inverse
  },
};
