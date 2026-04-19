import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { Colors, Fonts, type Palette } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const SERIF = Fonts!.serif;

const ACTIVE_INDICATOR_WIDTH = 14;
const TAB_LABELS: Record<string, string> = {
  index: "Games",
  leaderboard: "Stats",
  friends: "Friends",
  settings: "You",
};

/**
 * Editorial Ink tab bar — type-driven, no icons.
 *
 * Background: solid `bg` (not a glass pill).
 * Top border: 0.5px solid hairline.
 * Active indicator: 14×1px `tint` rule below the label, animated 200ms on switch.
 */
export function EditorialTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: palette.bg,
          borderTopColor: palette.hairline,
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const { options } = descriptors[route.key];
        const label = TAB_LABELS[route.name] ?? (typeof options.title === "string" ? options.title : route.name);

        const onPress = () => {
          Haptics.selectionAsync().catch(() => {});
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: "tabLongPress", target: route.key });
        };

        return (
          <TabItem
            key={route.key}
            label={label}
            isFocused={isFocused}
            palette={palette}
            onPress={onPress}
            onLongPress={onLongPress}
          />
        );
      })}
    </View>
  );
}

type TabItemProps = {
  label: string;
  isFocused: boolean;
  palette: Palette;
  onPress: () => void;
  onLongPress: () => void;
};

function TabItem({
  label,
  isFocused,
  palette,
  onPress,
  onLongPress,
}: TabItemProps) {
  const indicatorWidth = useRef(
    new Animated.Value(isFocused ? ACTIVE_INDICATOR_WIDTH : 0)
  ).current;

  useEffect(() => {
    Animated.timing(indicatorWidth, {
      toValue: isFocused ? ACTIVE_INDICATOR_WIDTH : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [isFocused, indicatorWidth]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={isFocused ? { selected: true } : {}}
      accessibilityLabel={label}
      onPress={onPress}
      onLongPress={onLongPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.item,
        { opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <Text
        style={{
          fontFamily: SERIF,
          fontSize: 15,
          letterSpacing: -0.2,
          color: isFocused ? palette.text : palette.muted,
          fontWeight: isFocused ? "500" : "400",
          fontStyle: isFocused ? "normal" : "italic",
        }}
        allowFontScaling={false}
      >
        {label}
      </Text>
      <Animated.View
        style={{
          marginTop: 4,
          height: 1,
          width: indicatorWidth,
          backgroundColor: palette.tint,
        }}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
});
