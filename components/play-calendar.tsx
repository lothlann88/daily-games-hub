import { useCallback, useState } from "react";
import { LayoutChangeEvent, StyleSheet, Text, View } from "react-native";

import { panelCard } from "@/components/activity-panel";
import { DEFAULT_LEVEL_OPACITY } from "@/components/streak-grid";
import { Fonts, type Palette } from "@/constants/theme";
import type { CalendarMonth } from "@/lib/activity";

const SERIF = Fonts!.serif;
const SANS = Fonts!.sans;

const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"];
const CELL_GAP = 4;
const MIN_CELL = 26;
const MAX_CELL = 38;

export type PlayCalendarProps = {
  month: CalendarMonth;
  palette: Palette;
  levelOpacity?: readonly [number, number, number, number];
};

/**
 * The current month, day by day, shaded like the activity grid.
 *
 * Cell size is clamped rather than a percentage of the width: on a wide desktop
 * window a square percentage cell would make the grid several hundred pixels
 * tall and drag the whole dashboard with it.
 */
export function PlayCalendar({
  month,
  palette,
  levelOpacity = DEFAULT_LEVEL_OPACITY,
}: PlayCalendarProps) {
  const [cell, setCell] = useState(MIN_CELL);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width <= 0) return;
    const fitted = Math.floor((width - CELL_GAP * 6) / 7);
    setCell(Math.max(MIN_CELL, Math.min(MAX_CELL, fitted)));
  }, []);

  return (
    <View
      style={[
        panelCard.card,
        { backgroundColor: palette.surface, borderColor: palette.hairline },
      ]}
    >
      <Text style={[panelCard.eyebrow, { color: palette.tint, fontFamily: SERIF }]}>
        — This month —
      </Text>
      <Text style={[styles.monthLabel, { color: palette.text, fontFamily: SERIF }]}>
        {month.label}
      </Text>
      <Text style={[styles.subline, { color: palette.muted, fontFamily: SANS }]}>
        {month.daysPlayedInMonth === 0
          ? "Nothing logged this month yet."
          : `${month.daysPlayedInMonth} ${
              month.daysPlayedInMonth === 1 ? "day" : "days"
            } · ${month.playsInMonth} ${month.playsInMonth === 1 ? "play" : "plays"}`}
      </Text>

      <View onLayout={handleLayout}>
        <View style={[styles.row, { gap: CELL_GAP }]}>
          {WEEKDAY_INITIALS.map((initial, i) => (
            <View key={`${initial}-${i}`} style={{ width: cell }}>
              <Text
                style={[styles.weekday, { color: palette.muted, fontFamily: SANS }]}
              >
                {initial}
              </Text>
            </View>
          ))}
        </View>

        {month.weeks.map((week, weekIndex) => (
          <View
            key={weekIndex}
            style={[styles.row, { gap: CELL_GAP, marginTop: CELL_GAP }]}
          >
            {week.map((day) => {
              const filled = day.level > 0;
              return (
                <View
                  key={day.date}
                  style={[
                    styles.cell,
                    {
                      width: cell,
                      height: cell,
                      borderColor: day.isToday ? palette.tint : "transparent",
                      borderWidth: day.isToday ? 1.5 : 0,
                    },
                    // Neighbouring months' padding days sit back a little.
                    !day.inMonth && styles.outOfMonth,
                    day.isFuture && !day.isToday && styles.future,
                  ]}
                >
                  {/* The shading is its own layer: opacity is inherited by
                      children, so fading the cell itself would take the day
                      number with it. */}
                  <View
                    style={[
                      StyleSheet.absoluteFill,
                      styles.fill,
                      {
                        backgroundColor: filled ? palette.tint : palette.faint,
                        opacity: filled ? levelOpacity[day.level] : 1,
                      },
                    ]}
                  />
                  <Text
                    style={[
                      styles.dayNumber,
                      {
                        color: day.level >= 2 ? palette.surface : palette.text,
                        fontFamily: SANS,
                      },
                    ]}
                    allowFontScaling={false}
                  >
                    {day.dayOfMonth}
                  </Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthLabel: {
    fontSize: 22,
    fontWeight: "500",
    letterSpacing: -0.4,
    marginBottom: 2,
  },
  subline: {
    fontSize: 12,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
  },
  weekday: {
    fontSize: 10,
    letterSpacing: 0.8,
    textAlign: "center",
    marginBottom: 2,
  },
  cell: {
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fill: {
    borderRadius: 3,
  },
  outOfMonth: {
    opacity: 0.35,
  },
  future: {
    opacity: 0.5,
  },
  dayNumber: {
    fontSize: 11,
  },
});
