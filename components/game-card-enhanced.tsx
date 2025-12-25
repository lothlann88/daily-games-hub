import { Pressable, StyleSheet, View, Image } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

import { ThemedText } from "./themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { getGameIcon } from "./ui/game-icons";
import { Game } from "@/types";

interface GameCardEnhancedProps {
  game: Game;
  onPress: () => void;
  onDelete?: () => void;
  onToggleFavorite?: () => void;
  isPlayedToday: boolean;
}

const SWIPE_THRESHOLD = 80;

export function GameCardEnhanced({
  game,
  onPress,
  onDelete,
  onToggleFavorite,
  isPlayedToday,
}: GameCardEnhancedProps) {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({ light: "#FFFFFF", dark: "#1F2937" }, "card");
  const borderColor = useThemeColor({ light: "#E5E7EB", dark: "#374151" }, "cardBorder");
  const shadowColor = useThemeColor({}, "shadow");
  const successColor = useThemeColor({ light: "#10B981", dark: "#34D399" }, "success");
  const errorColor = useThemeColor({ light: "#EF4444", dark: "#F87171" }, "error");
  const gradient1 = useThemeColor({}, "gradient1");
  const gradient2 = useThemeColor({}, "gradient2");

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, {
      damping: 15,
      stiffness: 300,
    });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 300,
    });
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10]) // Only activate on horizontal swipe
    .failOffsetY([-10, 10]) // Fail if vertical movement detected
    .onUpdate((event) => {
      translateX.value = event.translationX;
    })
    .onEnd((event) => {
      if (event.translationX < -SWIPE_THRESHOLD && onDelete) {
        // Swipe left to delete
        runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Warning);
        runOnJS(onDelete)();
      } else if (event.translationX > SWIPE_THRESHOLD && onToggleFavorite) {
        // Swipe right to favorite
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        runOnJS(onToggleFavorite)();
      }
      translateX.value = withSpring(0);
    });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={[animatedStyle, styles.container]}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.card,
            {
              backgroundColor: cardBackground,
              borderColor: borderColor,
              shadowColor: shadowColor,
            },
          ]}
        >
          {/* Icon container with gradient background or logo */}
          <View style={styles.iconContainer}>
            {game.logoUrl ? (
              <View style={styles.logoContainer}>
                <Image
                  source={{ uri: game.logoUrl }}
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>
            ) : (
              <LinearGradient
                colors={[gradient1, gradient2]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGradient}
              >
                {getGameIcon(game.id, 28, "#FFFFFF")}
              </LinearGradient>
            )}
          </View>

          {/* Game info */}
          <View style={styles.info}>
            <View style={styles.nameRow}>
              {game.isFavorite && (
                <ThemedText style={styles.favoriteIcon}>⭐</ThemedText>
              )}
              <ThemedText type="defaultSemiBold" style={styles.name} numberOfLines={1}>
                {game.name}
              </ThemedText>
            </View>
            <ThemedText style={styles.category} numberOfLines={1}>
              {game.category}
            </ThemedText>
          </View>

          {/* Badges */}
          <View style={styles.badges}>
            {game.currentStreak > 0 && (
              <View style={[styles.badge, styles.streakBadge]}>
                <ThemedText style={styles.badgeText}>🔥 {game.currentStreak}</ThemedText>
              </View>
            )}
            {isPlayedToday && (
              <View style={[styles.badge, { backgroundColor: successColor }]}>
                <ThemedText style={styles.badgeText}>✓</ThemedText>
              </View>
            )}
          </View>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    // Shadow for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    // Elevation for Android
    elevation: 3,
  },
  iconContainer: {
    marginRight: 16,
  },
  iconGradient: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    overflow: "hidden",
  },
  logo: {
    width: 48,
    height: 48,
  },
  info: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  favoriteIcon: {
    fontSize: 14,
    lineHeight: 22,
  },
  name: {
    fontSize: 17,
    lineHeight: 22,
    flex: 1,
  },
  category: {
    fontSize: 14,
    lineHeight: 18,
    opacity: 0.6,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
    marginLeft: 12,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 32,
  },
  streakBadge: {
    backgroundColor: "#FF9500",
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
});
