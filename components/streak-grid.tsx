import { View, StyleSheet } from "react-native";

import { buildDayWindow, playCountsByDay } from "@/lib/activity";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import type { Game } from "@/types";

/** Opacity applied to the accent colour at levels 1-3. Index 0 is unused. */
export const DEFAULT_LEVEL_OPACITY = [0, 0.34, 0.64, 1] as const;

export type StreakGridDay = {
  date: Date;
  played: boolean;
  /**
   * Shading bucket 0-3. Omit for a plain played/not-played grid: an omitted
   * level reads as 3 when played, which renders exactly as it always has.
   */
  level?: 0 | 1 | 2 | 3;
};

export type StreakGridProps = {
  /** Oldest → newest. Component pads/clips to `cols * rows`. */
  history: StreakGridDay[];
  /** Color for played cells. Defaults to current palette `tint`. */
  accent?: string;
  /** Force dark/light empty-cell color. Defaults to current color scheme. */
  dark?: boolean;
  cell?: number;
  gap?: number;
  cols?: number;
  rows?: number;
  /** Per-level opacity ramp for the accent colour. */
  levelOpacity?: readonly [number, number, number, number];
};

/**
 * Contribution-graph style calendar.
 *
 * Column-major: the first `rows` history entries fill column 1 top→bottom,
 * the next `rows` fill column 2, etc. Newest entry is bottom-right.
 */
export function StreakGrid({
  history,
  accent,
  dark,
  cell = 14,
  gap = 4,
  cols = 10,
  rows = 7,
  levelOpacity = DEFAULT_LEVEL_OPACITY,
}: StreakGridProps) {
  const scheme = useColorScheme() ?? "light";
  const isDark = dark ?? scheme === "dark";
  const palette = Colors[isDark ? "dark" : "light"];
  const playedColor = accent ?? palette.tint;
  const emptyColor = palette.faint;

  const total = cols * rows;
  // Take last `total` entries so newest sits at the end.
  const days = history.slice(-total);

  const columns: React.ReactNode[] = [];
  for (let c = 0; c < cols; c++) {
    const cells: React.ReactNode[] = [];
    for (let r = 0; r < rows; r++) {
      const idx = c * rows + r;
      const day = days[idx];
      // No level given means the caller only cares about played/not-played.
      const level = day ? (day.level ?? (day.played ? 3 : 0)) : 0;
      cells.push(
        <View
          key={`cell-${c}-${r}`}
          style={{
            width: cell,
            height: cell,
            borderRadius: 3,
            backgroundColor: level === 0 ? emptyColor : playedColor,
            opacity: level === 0 ? 1 : levelOpacity[level],
            marginBottom: r === rows - 1 ? 0 : gap,
          }}
        />
      );
    }
    columns.push(
      <View
        key={`col-${c}`}
        style={{
          marginRight: c === cols - 1 ? 0 : gap,
          flexDirection: "column",
        }}
      >
        {cells}
      </View>
    );
  }

  return <View style={styles.row}>{columns}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignSelf: "flex-start",
  },
});

/**
 * Convert a `Game.playHistory` (timestamps) into the day-by-day format the
 * grid expects. Returns the most recent `days` days, oldest → newest.
 */
export function buildHistoryDays(
  playHistory: number[],
  days: number
): StreakGridDay[] {
  const counts = playCountsByDay([{ playHistory } as Game]);
  return buildDayWindow(counts, days).map((day) => ({
    date: new Date(day.date),
    played: day.count > 0,
  }));
}
