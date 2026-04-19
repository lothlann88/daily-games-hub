import { Image, StyleSheet, Text, View } from "react-native";

import { Fonts } from "@/constants/theme";
import type { Game } from "@/types";

/**
 * Deterministic brand-color palette for game glyphs.
 *
 * Picked to read against warm-paper and ink backgrounds. Values come from the
 * Tailwind 600 family, weighted toward warm hues so they sit naturally next
 * to the ember `tint`.
 */
const GLYPH_COLORS = [
  "#C2410C", // orange-700
  "#0F766E", // teal-700
  "#7C2D12", // orange-900
  "#1E40AF", // blue-800
  "#854D0E", // yellow-800
  "#3F3F46", // zinc-700
  "#6D28D9", // violet-700
  "#15803D", // green-700
  "#9D174D", // pink-800
  "#1F2937", // slate-800
  "#0E7490", // cyan-700
  "#A16207", // amber-700
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function colorForGame(game: Pick<Game, "id" | "name">): string {
  const seed = `${game.id}::${game.name}`;
  return GLYPH_COLORS[hashString(seed) % GLYPH_COLORS.length];
}

/**
 * Pick a single-letter monogram from the game name. Skips the leading article
 * ("The Daily…") and grabs the first ASCII letter so emoji icons in the data
 * never end up as the glyph.
 */
function monogramFor(name: string): string {
  const cleaned = name.replace(/^(the|a|an)\s+/i, "").trim();
  for (const ch of cleaned) {
    if (/[A-Za-z0-9]/.test(ch)) return ch.toUpperCase();
  }
  return "·";
}

export type GameGlyphProps = {
  game: Pick<Game, "id" | "name" | "logoUrl" | "icon">;
  size?: number;
  radius?: number;
  /**
   * If true, prefer the fetched logoUrl image over the letter monogram.
   * Default true.
   */
  preferLogo?: boolean;
};

export function GameGlyph({
  game,
  size = 44,
  radius = 6,
  preferLogo = true,
}: GameGlyphProps) {
  const color = colorForGame(game);
  const letter = monogramFor(game.name);

  if (preferLogo && game.logoUrl) {
    return (
      <View
        style={[
          styles.tile,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: color,
          },
        ]}
      >
        <Image
          source={{ uri: game.logoUrl }}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
          }}
          resizeMode="cover"
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: color,
        },
      ]}
    >
      <Text
        style={[
          styles.letter,
          {
            fontSize: size * 0.44,
            // 0.44 is large; use the system serif to ground the editorial feel.
            fontFamily: Fonts.serif,
          },
        ]}
        allowFontScaling={false}
      >
        {letter}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  letter: {
    color: "#FFFFFF",
    fontWeight: "800",
    letterSpacing: -0.5,
    textAlign: "center",
    includeFontPadding: false,
  },
});
