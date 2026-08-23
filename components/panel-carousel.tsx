import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Fonts, type Palette } from "@/constants/theme";

const SANS = Fonts!.sans;

export type CarouselPanel = {
  key: string;
  label: string;
  node: ReactNode;
};

export type PanelCarouselProps = {
  panels: CarouselPanel[];
  /** Controlled page index. */
  index: number;
  onIndexChange: (index: number) => void;
  palette: Palette;
  /** Floor for the track height so an empty first paint doesn't jolt the list. */
  minHeight?: number;
};

/**
 * Horizontally paged panels.
 *
 * On web `pagingEnabled` compiles to CSS scroll snapping, which gives us touch
 * swipe and trackpad scrolling for free. It gives a mouse user nothing, though
 * — an overflow container can't be dragged with a mouse — so the labels below
 * are the primary desktop control, not decoration.
 *
 * All panels stay mounted side by side in a flex row, so the track is as tall
 * as the tallest panel and moving between them can't shift the layout.
 */
export function PanelCarousel({
  panels,
  index,
  onIndexChange,
  palette,
  minHeight = 300,
}: PanelCarouselProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [pageWidth, setPageWidth] = useState(0);
  // Mirrors `index` so the scroll handler can compare without re-subscribing.
  const indexRef = useRef(index);

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const width = Math.round(event.nativeEvent.layout.width);
    setPageWidth((current) => (width > 0 && width !== current ? width : current));
  }, []);

  // Drive the scroll position when the index changes from outside — a label
  // tap, an arrow key, or the panel restored from preferences.
  useEffect(() => {
    if (pageWidth === 0 || indexRef.current === index) return;
    indexRef.current = index;
    scrollRef.current?.scrollTo({ x: index * pageWidth, animated: true });
  }, [index, pageWidth]);

  // Re-anchor after a resize so a width change can't leave us mid-panel.
  useEffect(() => {
    if (pageWidth === 0) return;
    scrollRef.current?.scrollTo({ x: indexRef.current * pageWidth, animated: false });
  }, [pageWidth]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (pageWidth === 0) return;
      const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
      if (next === indexRef.current || next < 0 || next >= panels.length) return;
      indexRef.current = next;
      onIndexChange(next);
    },
    [pageWidth, panels.length, onIndexChange]
  );

  const handleKeyDown = useCallback(
    (event: { key?: string; preventDefault?: () => void }) => {
      const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
      if (delta === 0) return;
      const next = Math.min(panels.length - 1, Math.max(0, indexRef.current + delta));
      if (next === indexRef.current) return;
      event.preventDefault?.();
      onIndexChange(next);
    },
    [panels.length, onIndexChange]
  );

  return (
    <View>
      <View onLayout={handleLayout}>
        {pageWidth === 0 ? (
          // Reserve the space until we know how wide a page is, so the panels
          // never flash stacked at full width.
          <View style={{ height: minHeight }} />
        ) : (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={handleScroll}
            decelerationRate="fast"
            disableIntervalMomentum
          >
            {panels.map((panel) => (
              <View key={panel.key} style={{ width: pageWidth, minHeight }}>
                {panel.node}
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      <View
        style={styles.indicator}
        // RN's ViewProps has no onKeyDown, but react-native-web forwards it.
        {...({ onKeyDown: handleKeyDown, tabIndex: 0 } as any)}
      >
        {panels.map((panel, i) => {
          const selected = i === index;
          return (
            <Pressable
              key={panel.key}
              onPress={() => onIndexChange(i)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Show ${panel.label}`}
              style={({ pressed }) => [styles.tab, { opacity: pressed ? 0.6 : 1 }]}
            >
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: selected ? palette.text : palette.muted,
                    fontFamily: SANS,
                  },
                ]}
              >
                {panel.label}
              </Text>
              <View
                style={[
                  styles.tabUnderline,
                  { backgroundColor: selected ? palette.tint : "transparent" },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  indicator: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
    marginTop: 14,
  },
  tab: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    fontWeight: "500",
  },
  tabUnderline: {
    height: 1.5,
    width: 18,
    borderRadius: 1,
  },
});
