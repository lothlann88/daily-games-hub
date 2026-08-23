import { useCallback, useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { ActivityPanel } from "@/components/activity-panel";
import { PanelCarousel, type CarouselPanel } from "@/components/panel-carousel";
import { PlayCalendar } from "@/components/play-calendar";
import { StreakPanel } from "@/components/streak-panel";
import type { Palette } from "@/constants/theme";
import {
  DASHBOARD_PANELS,
  DASHBOARD_PANEL_LABELS,
  type ActivitySummary,
  type CalendarMonth,
  type DashboardPanel,
} from "@/lib/activity";
import type { GameWithFlag } from "@/lib/library";

export type HomeDashboardProps = {
  summary: ActivitySummary;
  month: CalendarMonth;
  /** The game on the longest active streak, or null when nothing is running. */
  top: GameWithFlag | null;
  others: GameWithFlag[];
  bestEver: number;
  panel: DashboardPanel;
  onPanelChange: (panel: DashboardPanel) => void;
  palette: Palette;
  scheme: "light" | "dark";
  onOpenGame: (id: string) => void;
};

/** The three swipeable panels at the top of the home screen. */
export function HomeDashboard({
  summary,
  month,
  top,
  others,
  bestEver,
  panel,
  onPanelChange,
  palette,
  scheme,
  onOpenGame,
}: HomeDashboardProps) {
  const panels = useMemo<CarouselPanel[]>(
    () => [
      {
        key: "activity",
        label: DASHBOARD_PANEL_LABELS.activity,
        node: <ActivityPanel summary={summary} palette={palette} scheme={scheme} />,
      },
      {
        key: "streak",
        label: DASHBOARD_PANEL_LABELS.streak,
        node: (
          <StreakPanel
            top={top}
            others={others}
            bestEver={bestEver}
            palette={palette}
            scheme={scheme}
            onOpenGame={onOpenGame}
          />
        ),
      },
      {
        key: "calendar",
        label: DASHBOARD_PANEL_LABELS.calendar,
        node: <PlayCalendar month={month} palette={palette} />,
      },
    ],
    [summary, month, top, others, bestEver, palette, scheme, onOpenGame]
  );

  const index = Math.max(0, DASHBOARD_PANELS.indexOf(panel));

  const handleIndexChange = useCallback(
    (next: number) => {
      const key = DASHBOARD_PANELS[next];
      if (key) onPanelChange(key);
    },
    [onPanelChange]
  );

  return (
    <View style={styles.wrap}>
      <PanelCarousel
        panels={panels}
        index={index}
        onIndexChange={handleIndexChange}
        palette={palette}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 24,
  },
});
