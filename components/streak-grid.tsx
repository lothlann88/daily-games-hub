import { View, StyleSheet } from "react-native";

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export type StreakGridDay = {
  date: Date;
  played: boolean;
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
      const played = !!(day && day.played);
      cells.push(
        <View
          key={`cell-${c}-${r}`}
          style={{
            width: cell,
            height: cell,
            borderRadius: 3,
            backgroundColor: played ? playedColor : emptyColor,
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
  const startOfDay = (ts: number) => {
    const d = new Date(ts);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  const playedDays = new Set(playHistory.map(startOfDay));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const out: StreakGridDay[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    out.push({ date: d, played: playedDays.has(d.getTime()) });
  }
  return out;
}
