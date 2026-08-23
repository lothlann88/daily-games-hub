import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { DEFAULT_LEVEL_OPACITY, StreakGrid, type StreakGridDay } from "@/components/streak-grid";
import { Fonts, type Palette } from "@/constants/theme";
import type { ActivitySummary } from "@/lib/activity";

const SERIF = Fonts!.serif;
const SANS = Fonts!.sans;

export const panelCard = StyleSheet.create({
  card: {
    marginHorizontal: 24,
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 20,
    borderRadius: 4,
    borderWidth: 1,
    flex: 1,
  },
  eyebrow: {
    fontSize: 11,
    fontStyle: "italic",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
});

export type ActivityPanelProps = {
  summary: ActivitySummary;
  palette: Palette;
  scheme: "light" | "dark";
};

export function ActivityPanel({ summary, palette, scheme }: ActivityPanelProps) {
  const history = useMemo<StreakGridDay[]>(
    () =>
      summary.days.map((day) => ({
        date: new Date(day.date),
        played: day.count > 0,
        level: day.level,
      })),
    [summary.days]
  );

  const hasPlays = summary.totalDaysPlayed > 0;

  return (
    <View
      style={[
        panelCard.card,
        { backgroundColor: palette.surface, borderColor: palette.hairline },
      ]}
    >
      <Text style={[panelCard.eyebrow, { color: palette.tint, fontFamily: SERIF }]}>
        — Ten weeks of play —
      </Text>

      <View style={styles.numberRow}>
        <Text
          style={[styles.number, { color: palette.tint, fontFamily: SERIF }]}
          allowFontScaling={false}
        >
          {summary.totalDaysPlayed}
        </Text>
        <Text style={[styles.numberLabel, { color: palette.muted, fontFamily: SANS }]}>
          {summary.totalDaysPlayed === 1 ? "DAY PLAYED" : "DAYS PLAYED"}
        </Text>
      </View>

      <Text style={[styles.subline, { color: palette.muted, fontFamily: SANS }]}>
        {hasPlays ? (
          <>
            <Text style={{ color: palette.text, fontWeight: "500" }}>
              {summary.daysInLastWeek}
            </Text>
            {" of the last 7"}
            {summary.currentAnyStreak > 0 ? (
              <>
                {" · "}
                <Text style={{ color: palette.text, fontWeight: "500" }}>
                  {summary.currentAnyStreak}
                </Text>
                {summary.currentAnyStreak === 1 ? " day running" : " days running"}
              </>
            ) : null}
            {" · "}
            {summary.totalPlays} {summary.totalPlays === 1 ? "play" : "plays"} all told
          </>
        ) : (
          "Log a game and this starts filling in."
        )}
      </Text>

      <StreakGrid
        history={history}
        accent={palette.tint}
        dark={scheme === "dark"}
        cell={11}
        gap={3}
      />

      <View style={styles.legend}>
        <Text style={[styles.legendLabel, { color: palette.muted, fontFamily: SANS }]}>
          Less
        </Text>
        {[0, 1, 2, 3].map((level) => (
          <View
            key={level}
            style={[
              styles.legendSwatch,
              {
                backgroundColor: level === 0 ? palette.faint : palette.tint,
                opacity: level === 0 ? 1 : DEFAULT_LEVEL_OPACITY[level],
              },
            ]}
          />
        ))}
        <Text style={[styles.legendLabel, { color: palette.muted, fontFamily: SANS }]}>
          More
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  numberRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 6,
  },
  number: {
    fontSize: 72,
    fontWeight: "400",
    letterSpacing: -2,
    lineHeight: 76,
  },
  numberLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginLeft: 10,
    marginBottom: 14,
  },
  subline: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 18,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
  },
  legendLabel: {
    fontSize: 10,
    letterSpacing: 0.6,
  },
  legendSwatch: {
    width: 9,
    height: 9,
    borderRadius: 2,
  },
});
