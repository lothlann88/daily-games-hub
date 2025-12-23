import { useState, useMemo } from "react";
import {
  StyleSheet,
  FlatList,
  RefreshControl,
  View,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { GameCard } from "@/components/game-card";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useGames } from "@/hooks/use-storage";
import { useThemeColor } from "@/hooks/use-theme-color";
import { Game } from "@/types";

export default function HomeScreen() {
  const { games, loading, refresh } = useGames();
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const tintColor = useThemeColor({}, "tint");
  const backgroundColor = useThemeColor({}, "background");

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleGamePress = (game: Game) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({ pathname: "/game-detail" as any, params: { gameId: game.id } });
  };

  const handleAddGame = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/add-game" as any);
  };

  // Check if game was played today (simplified - checks if lastPlayed is today)
  const isPlayedToday = (game: Game): boolean => {
    if (!game.lastPlayed) return false;
    const today = new Date().setHours(0, 0, 0, 0);
    const playedDate = new Date(game.lastPlayed).setHours(0, 0, 0, 0);
    return today === playedDate;
  };

  const renderGame = ({ item }: { item: Game }) => (
    <GameCard
      game={item}
      onPress={() => handleGamePress(item)}
      isPlayedToday={isPlayedToday(item)}
    />
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <ThemedText type="title">Daily Games</ThemedText>
      <ThemedText style={styles.subtitle}>
        {games.length} {games.length === 1 ? "game" : "games"} available
      </ThemedText>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyText}>No games yet</ThemedText>
      <ThemedText style={styles.emptySubtext}>Tap the + button to add your first game</ThemedText>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tintColor} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={games}
        renderItem={renderGame}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={tintColor}
          />
        }
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: Math.max(insets.top, 20) + 8,
            paddingBottom: Math.max(insets.bottom, 20) + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
      />
      <Pressable
        onPress={handleAddGame}
        style={[
          styles.fab,
          {
            backgroundColor: tintColor,
            bottom: Math.max(insets.bottom, 20) + 60,
          },
        ]}
      >
        <IconSymbol name="plus" size={24} color="#fff" />
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 0,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.6,
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.6,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
