/**
 * Below are the colors that are used in the app. The colors are defined in the light, dark, and pure black modes.
 * Enhanced with modern gradients and sophisticated color palette for a premium look.
 */

export const Colors = {
  light: {
    background: "#f8fafc", // Soft off-white background
    surface: "#ffffffff", // Pure white for cards, sheets, menus
    surfaceVariant: "#f1f5f9", // Slightly darker than surface for contrast
    separator: "#1c1c1dff", // Subtle dividers, lines
    outline: "#cbd5e1", // Soft borders, strokes
    footer: "#ffffffff", // Footer background

    primary: "#6366f1", // Modern indigo (replaces purple)
    primaryVariant: "#4f46e5", // Darker primary for hover states
    onPrimary: "#ffffff", // Text/icons on primary
    secondary: "#10b981", // Fresh emerald green
    secondaryVariant: "#059669", // Darker secondary
    onSecondary: "#ffffff", // Text/icons on secondary
    tertiary: "#f59e0b", // Warm amber accent
    error: "#ef4444", // Modern red for errors
    onError: "#ffffff", // Text/icons on error
    success: "#22c55e", // Success green
    warning: "#f59e0b", // Warning amber

    textPrimary: "#1e293b", // Rich dark text
    textSecondary: "#64748b", // Balanced secondary text
    textMuted: "#94a3b8", // Muted text for less important content
    placeholder: "#a1a1aa", // Placeholder text color
    disabled: "#d1d5db", // Disabled text/icons
    inverseSurface: "#1e293b", // For dark overlays
    inverseOnSurface: "#ffffff", // Text/icons on inverse

    // Gradient colors
    gradientStart: "#6366f1",
    gradientEnd: "#8b5cf6",
    gradientAccent: "#06b6d4",
  },
  dark: {
    background: "#0f172a", // Deep slate background
    surface: "#1e293b", // Elevated surface color
    surfaceVariant: "#334155", // Lighter variant for contrast
    separator: "#475569", // Visible dividers in dark mode
    outline: "#64748b", // Borders, strokes
    footer: "#1e293b", // Footer background

    primary: "#818cf8", // Lighter indigo for dark mode
    primaryVariant: "#6366f1", // Darker variant
    onPrimary: "#0f172a", // Dark text on primary
    secondary: "#34d399", // Bright emerald for dark mode
    secondaryVariant: "#10b981", // Darker secondary
    onSecondary: "#0f172a", // Dark text on secondary
    tertiary: "#fbbf24", // Bright amber
    error: "#f87171", // Softer red for dark mode
    onError: "#0f172a", // Dark text on error
    success: "#4ade80", // Bright success green
    warning: "#fbbf24", // Warning amber

    textPrimary: "#f8fafc", // Near white for primary text
    textSecondary: "#cbd5e1", // Light gray for secondary text
    textMuted: "#94a3b8", // Muted text
    placeholder: "#6b7280", // Darker placeholder in dark mode
    disabled: "#4b5563", // Disabled text/icons
    inverseSurface: "#f8fafc", // Light overlays
    inverseOnSurface: "#0f172a", // Dark text on light overlays

    // Gradient colors
    gradientStart: "#818cf8",
    gradientEnd: "#a78bfa",
    gradientAccent: "#22d3ee",
  },
  black: {
    background: "#000000", // Pure black background
    surface: "#111111", // Very dark gray for cards, sheets, menus
    surfaceVariant: "#1a1a1a", // Slightly lighter for contrast
    separator: "#2a2a2a", // Subtle dividers in pure black mode
    outline: "#333333", // Borders, strokes
    footer: "#111111", // Footer background

    primary: "#9ca3f5", // Bright indigo for pure black mode
    primaryVariant: "#818cf8", // Darker variant
    onPrimary: "#000000", // Black text on primary
    secondary: "#4ade80", // Bright emerald for pure black mode
    secondaryVariant: "#34d399", // Darker secondary
    onSecondary: "#000000", // Black text on secondary
    tertiary: "#fcd34d", // Bright amber
    error: "#fb7185", // Bright red for pure black mode
    onError: "#000000", // Black text on error
    success: "#5eead4", // Bright success green
    warning: "#fcd34d", // Warning amber

    textPrimary: "#ffffff", // Pure white for primary text
    textSecondary: "#d1d5db", // Light gray for secondary text
    textMuted: "#9ca3af", // Muted text
    placeholder: "#6b7280", // Placeholder in pure black mode
    disabled: "#4b5563", // Disabled text/icons
    inverseSurface: "#ffffff", // White overlays
    inverseOnSurface: "#000000", // Black text on white overlays

    // Gradient colors
    gradientStart: "#9ca3f5",
    gradientEnd: "#c4b5fd",
    gradientAccent: "#7dd3fc",
  },
};
