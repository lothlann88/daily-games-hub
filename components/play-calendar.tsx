import { View, StyleSheet, Pressable } from "react-native";
import { ThemedText } from "./themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

interface PlayCalendarProps {
  playHistory: number[]; // Array of timestamps
  currentStreak: number;
  longestStreak: number;
}

interface CalendarDay {
  date: Date;
  isPlayed: boolean;
  isToday: boolean;
  isCurrentMonth: boolean;
}

export function PlayCalendar({ playHistory, currentStreak, longestStreak }: PlayCalendarProps) {
  const tintColor = useThemeColor({}, "tint");
  const successColor = useThemeColor({ light: "#10B981", dark: "#34D399" }, "success");
  const cardBackground = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "cardBorder");
  const textColor = useThemeColor({}, "text");

  // Get current month and year
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const startingDayOfWeek = firstDayOfMonth.getDay();

  // Convert play history timestamps to date strings (YYYY-MM-DD)
  const playedDates = new Set(
    playHistory.map((timestamp) => {
      const date = new Date(timestamp);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    })
  );

  // Build calendar grid
  const calendarDays: CalendarDay[] = [];

  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    const date = new Date(currentYear, currentMonth, -startingDayOfWeek + i + 1);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    calendarDays.push({
      date,
      isPlayed: playedDates.has(dateStr),
      isToday: false,
      isCurrentMonth: false,
    });
  }

  // Add days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentYear, currentMonth, day);
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    calendarDays.push({
      date,
      isPlayed: playedDates.has(dateStr),
      isToday,
      isCurrentMonth: true,
    });
  }

  // Add remaining cells to complete the grid
  const remainingCells = 42 - calendarDays.length; // 6 rows × 7 days
  for (let i = 1; i <= remainingCells; i++) {
    const date = new Date(currentYear, currentMonth + 1, i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    calendarDays.push({
      date,
      isPlayed: playedDates.has(dateStr),
      isToday: false,
      isCurrentMonth: false,
    });
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <View style={styles.container}>
      {/* Header with month/year */}
      <View style={styles.header}>
        <ThemedText type="subtitle">
          {monthNames[currentMonth]} {currentYear}
        </ThemedText>
      </View>

      {/* Streak stats */}
      <View style={styles.statsRow}>
        <View style={[styles.statBox, { backgroundColor: cardBackground, borderColor }]}>
          <ThemedText style={styles.statValue}>{currentStreak}</ThemedText>
          <ThemedText style={styles.statLabel}>Current Streak</ThemedText>
        </View>
        <View style={[styles.statBox, { backgroundColor: cardBackground, borderColor }]}>
          <ThemedText style={styles.statValue}>{longestStreak}</ThemedText>
          <ThemedText style={styles.statLabel}>Longest Streak</ThemedText>
        </View>
        <View style={[styles.statBox, { backgroundColor: cardBackground, borderColor }]}>
          <ThemedText style={styles.statValue}>{playHistory.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Total Plays</ThemedText>
        </View>
      </View>

      {/* Day names header */}
      <View style={styles.dayNamesRow}>
        {dayNames.map((day) => (
          <View key={day} style={styles.dayNameCell}>
            <ThemedText style={styles.dayNameText}>{day}</ThemedText>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {calendarDays.map((day, index) => {
          let backgroundColor = "transparent";
          let opacity = 1;

          if (day.isPlayed) {
            backgroundColor = successColor;
            opacity = day.isCurrentMonth ? 1 : 0.3;
          }

          if (day.isToday) {
            backgroundColor = tintColor;
            opacity = 1;
          }

          return (
            <View
              key={index}
              style={[
                styles.dayCell,
                {
                  backgroundColor,
                  opacity: day.isCurrentMonth ? opacity : 0.3,
                },
              ]}
            >
              <ThemedText
                style={[
                  styles.dayText,
                  {
                    color: day.isPlayed || day.isToday ? "#FFFFFF" : textColor,
                    fontWeight: day.isToday ? "700" : "400",
                  },
                ]}
              >
                {day.date.getDate()}
              </ThemedText>
            </View>
          );
        })}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: successColor }]} />
          <ThemedText style={styles.legendText}>Played</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: tintColor }]} />
          <ThemedText style={styles.legendText}>Today</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  header: {
    alignItems: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statBox: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 32,
  },
  statLabel: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.6,
    textAlign: "center",
  },
  dayNamesRow: {
    flexDirection: "row",
    marginTop: 8,
  },
  dayNameCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.6,
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  dayCell: {
    width: "13.28%", // (100% - 6 gaps) / 7 days
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 8,
  },
  dayText: {
    fontSize: 14,
    lineHeight: 20,
  },
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
