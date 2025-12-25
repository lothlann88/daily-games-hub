/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from "react-native";

// Modern sophisticated purple palette
const tintColorLight = "#7C3AED"; // Deep purple
const tintColorDark = "#A78BFA"; // Light purple

export const Colors = {
  light: {
    text: "#1F2937", // Dark gray
    background: "#FFFFFF", // Pure white
    tint: tintColorLight,
    icon: "#6B7280", // Medium gray
    tabIconDefault: "#9CA3AF", // Light gray
    tabIconSelected: tintColorLight,
    // Additional colors for modern UI
    card: "#F9FAFB", // Off-white card background
    cardBorder: "#E5E7EB", // Light border
    success: "#10B981", // Green
    warning: "#F59E0B", // Orange
    error: "#EF4444", // Red
    gradient1: "#7C3AED", // Purple
    gradient2: "#A78BFA", // Light purple
    shadow: "rgba(124, 58, 237, 0.1)", // Purple shadow
  },
  dark: {
    text: "#F9FAFB", // Off-white
    background: "#111827", // Dark background
    tint: tintColorDark,
    icon: "#9CA3AF", // Medium gray
    tabIconDefault: "#6B7280", // Dark gray
    tabIconSelected: tintColorDark,
    // Additional colors for modern UI
    card: "#1F2937", // Dark card background
    cardBorder: "#374151", // Dark border
    success: "#34D399", // Light green
    warning: "#FBBF24", // Light orange
    error: "#F87171", // Light red
    gradient1: "#A78BFA", // Light purple
    gradient2: "#7C3AED", // Deep purple
    shadow: "rgba(167, 139, 250, 0.15)", // Light purple shadow
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
