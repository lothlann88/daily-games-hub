import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { panelCard } from "@/components/activity-panel";
import { buildHistoryDays, StreakGrid } from "@/components/streak-grid";
import { Fonts, streakColor, type Palette } from "@/constants/theme";
import type { GameWithFlag } from "@/lib/library";

const SERIF = Fonts!.serif;
const SANS = Fonts!.sans;

export type StreakPanelProps = {
  /** The game on the longest active streak, or null when nothing is running. */
  top: GameWithFlag | null;
  /** The remaining games with a live streak. */
  others: GameWithFlag[];
  /** Best streak ever recorded, used by the empty state. */
  bestEver: number;
  palette: Palette;
  scheme: "light" | "dark";
  onOpenGame: (id: string) => void;
};

export function StreakPanel({
  top,
  others,
  bestEver,
  palette,
  scheme,
  onOpenGame,
}: StreakPanelProps) {
  const history = useMemo(
    () => (top ? buildHistoryDays(top.playHistory, 70) : []),
    [top]
  );

  if (!top) {
    return (
      <View
        style={[
          panelCard.card,
          { backgroundColor: palette.surface, borderColor: palette.hairline },
        ]}
      >
        <Text style={[panelCard.eyebrow, { color: palette.tint, fontFamily: SERIF }]}>
          — Longest active streak —
        </Text>
        <Text style={[styles.gameName, { color: palette.text, fontFamily: SERIF }]}>
          Nothing running
        </Text>
        <Text style={[styles.best, { color: palette.muted, fontFamily: SANS }]}>
          {bestEver > 0
            ? `Play a game today and it starts here. Your best is ${bestEver} days.`
            : "Play a game today and it starts here."}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        panelCard.card,
        { backgroundColor: palette.surface, borderColor: palette.hairline },
      ]}
    >
      <Pressable
        onPress={() => onOpenGame(top.id)}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Text style={[panelCard.eyebrow, { color: palette.tint, fontFamily: SERIF }]}>
          — Longest active streak —
        </Text>
        <Text style={[styles.gameName, { color: palette.text, fontFamily: SERIF }]}>
          {top.name}
        </Text>
        <Text style={[styles.best, { color: palette.muted, fontFamily: SANS }]}>
          Best ever · {top.longestStreak} days
        </Text>

        <View style={styles.numberRow}>
          <Text
            style={[styles.number, { color: palette.tint, fontFamily: SERIF }]}
            allowFontScaling={false}
          >
            {top.currentStreak}
          </Text>
          <Text style={[styles.numberLabel, { color: palette.muted, fontFamily: SANS }]}>
            DAYS RUNNING
          </Text>
        </View>

        <StreakGrid
          history={history}
          accent={palette.tint}
          dark={scheme === "dark"}
          cell={11}
          gap={3}
        />
      </Pressable>

      {others.length > 0 ? (
        <View style={[styles.ribbon, { borderTopColor: palette.hairline }]}>
          <Text style={[styles.ribbonLabel, { color: palette.muted, fontFamily: SERIF }]}>
            and {others.length} more —
          </Text>
          <View style={styles.chips}>
            {others.map((game) => {
              const color = streakColor(game.currentStreak, game.playedToday, palette);
              return (
                <Pressable
                  key={game.id}
                  onPress={() => onOpenGame(game.id)}
                  hitSlop={6}
                  style={({ pressed }) => [styles.chip, { opacity: pressed ? 0.7 : 1 }]}
                >
                  <Text style={{ fontSize: 13, color: palette.muted, fontFamily: SANS }}>
                    {game.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: SERIF,
                      fontSize: 15,
                      fontWeight: "500",
                      color,
                      letterSpacing: -0.2,
                    }}
                    allowFontScaling={false}
                  >
                    {game.currentStreak}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  gameName: {
    fontSize: 26,
    fontWeight: "500",
    letterSpacing: -0.6,
    lineHeight: 26 * 1.1,
    marginBottom: 2,
  },
  best: {
    fontSize: 12,
    marginBottom: 18,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 18,
  },
  number: {
    fontSize: 84,
    fontWeight: "500",
    letterSpacing: -2.5,
    lineHeight: 84 * 0.85,
    includeFontPadding: false,
  },
  numberLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginLeft: 10,
    marginBottom: 6,
  },
  ribbon: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ribbonLabel: {
    fontSize: 11,
    fontStyle: "italic",
    marginBottom: 10,
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  chip: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
});
