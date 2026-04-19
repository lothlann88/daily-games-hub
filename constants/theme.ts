/**
 * Editorial Ink palette for Daily Games Hub.
 *
 * Source of truth: design_handoff_editorial_ink/README.md.
 *
 * Two layers:
 * 1. Editorial Ink design tokens (`bg`, `surface`, `surfaceAlt`, `muted`, `faint`,
 *    `hairline`, `tint`, `tintSoft`, `ink`, `success`, `loss`) — used by the
 *    redesigned Home, Game Detail, and tab bar.
 * 2. Legacy aliases (`background`, `card`, `cardBorder`, `gradient1`, `gradient2`,
 *    `warning`, `error`, `shadow`, `icon`, `tabIconDefault`, `tabIconSelected`) —
 *    kept so the unredesigned screens (auth, friends, settings, leaderboard,
 *    add-game, add-friend) keep rendering without wholesale rewrites.
 *
 * Aliases are mapped to the closest Editorial Ink token so the warm-paper palette
 * carries through the rest of the app.
 */

import { Platform } from "react-native";

const EDITORIAL_INK = {
  light: {
    bg: "#F5F1EA",
    surface: "#FBF8F2",
    surfaceAlt: "#EBE6DC",
    text: "#1C1917",
    muted: "rgba(28,25,23,0.58)",
    faint: "rgba(28,25,23,0.09)",
    hairline: "rgba(28,25,23,0.12)",
    tint: "#C2410C",
    tintSoft: "rgba(194,65,12,0.10)",
    ink: "#1C1917",
    success: "#15803D",
    loss: "#B91C1C",
  },
  dark: {
    bg: "#0C0B0A",
    surface: "#17161A",
    surfaceAlt: "#221F22",
    text: "#F5F0E6",
    muted: "rgba(245,240,230,0.56)",
    faint: "rgba(245,240,230,0.07)",
    hairline: "rgba(245,240,230,0.11)",
    tint: "#FB923C",
    tintSoft: "rgba(251,146,60,0.14)",
    ink: "#F5F0E6",
    success: "#4ADE80",
    loss: "#FCA5A5",
  },
} as const;

/**
 * Widened palette type. The Editorial Ink palettes for light and dark have
 * identical shape but different literal values; component prop types should
 * accept either, so widen to `string`.
 */
export type Palette = {
  // Editorial Ink core
  bg: string;
  surface: string;
  surfaceAlt: string;
  text: string;
  muted: string;
  faint: string;
  hairline: string;
  tint: string;
  tintSoft: string;
  ink: string;
  success: string;
  loss: string;
  // Legacy aliases
  background: string;
  card: string;
  cardBorder: string;
  icon: string;
  tabIconDefault: string;
  tabIconSelected: string;
  warning: string;
  error: string;
  gradient1: string;
  gradient2: string;
  shadow: string;
};

export const Colors: { light: Palette; dark: Palette } = {
  light: {
    // Editorial Ink tokens
    ...EDITORIAL_INK.light,
    // Legacy aliases (mapped to Editorial Ink)
    background: EDITORIAL_INK.light.bg,
    card: EDITORIAL_INK.light.surface,
    cardBorder: EDITORIAL_INK.light.hairline,
    icon: EDITORIAL_INK.light.muted,
    tabIconDefault: EDITORIAL_INK.light.muted,
    tabIconSelected: EDITORIAL_INK.light.tint,
    warning: "#B45309",
    error: EDITORIAL_INK.light.loss,
    gradient1: EDITORIAL_INK.light.tint,
    gradient2: "#EA580C",
    shadow: "rgba(28,25,23,0.10)",
  },
  dark: {
    // Editorial Ink tokens
    ...EDITORIAL_INK.dark,
    // Legacy aliases (mapped to Editorial Ink)
    background: EDITORIAL_INK.dark.bg,
    card: EDITORIAL_INK.dark.surface,
    cardBorder: EDITORIAL_INK.dark.hairline,
    icon: EDITORIAL_INK.dark.muted,
    tabIconDefault: EDITORIAL_INK.dark.muted,
    tabIconSelected: EDITORIAL_INK.dark.tint,
    warning: "#FDBA74",
    error: EDITORIAL_INK.dark.loss,
    gradient1: EDITORIAL_INK.dark.tint,
    gradient2: "#F97316",
    shadow: "rgba(0,0,0,0.30)",
  },
};

/**
 * Editorial Ink typography stacks.
 *
 * Serif — display, numerals, editorial moments. `Iowan Old Style` ships with
 * iOS; the fallback chain hits `Hoefler Text`, then Fraunces (vendor via
 * `expo-font` if Android needs it), then Georgia.
 *
 * Sans — UI chrome, buttons, tabular labels. Native system sans on iOS, the
 * usual stack everywhere else.
 */
export const Fonts = Platform.select({
  ios: {
    sans: "system-ui",
    sansAlt: "-apple-system",
    serif: "Iowan Old Style",
    serifAlt: "Hoefler Text",
    rounded: "ui-rounded",
    mono: "ui-monospace",
  },
  android: {
    sans: "sans-serif",
    sansAlt: "sans-serif",
    serif: "serif",
    serifAlt: "serif",
    rounded: "sans-serif",
    mono: "monospace",
  },
  default: {
    sans: "normal",
    sansAlt: "normal",
    serif: "serif",
    serifAlt: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "-apple-system, 'SF Pro Text', 'Inter', system-ui, sans-serif",
    sansAlt: "-apple-system, 'SF Pro Text', 'Inter', system-ui, sans-serif",
    serif: "'Iowan Old Style', 'Hoefler Text', 'Fraunces', Georgia, serif",
    serifAlt: "'Iowan Old Style', 'Hoefler Text', 'Fraunces', Georgia, serif",
    rounded:
      "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/**
 * Streak-number color rule (Editorial Ink).
 *
 * Ember (`tint`) when:
 *   - the streak hits a milestone {7, 14, 30, 50, 100, 365}, OR
 *   - the streak is active (>0) and not yet played today (urgency).
 * Otherwise ink (`text`).
 */
export const STREAK_MILESTONES = new Set([7, 14, 30, 50, 100, 365]);

export function streakColor(
  currentStreak: number,
  playedToday: boolean,
  palette: { tint: string; text: string }
): string {
  if (STREAK_MILESTONES.has(currentStreak)) return palette.tint;
  if (currentStreak > 0 && !playedToday) return palette.tint;
  return palette.text;
}
