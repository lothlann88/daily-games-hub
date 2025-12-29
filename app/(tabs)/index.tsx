import { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  FlatList,
  RefreshControl,
  View,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { GameCardSimple } from "@/components/game-card-simple";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useGames, useScores } from "@/hooks/use-storage";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuth } from "@/contexts/auth-context";
import { wasPlayedToday } from "@/lib/streaks";
import { fetchGameLogo } from "@/lib/logo-fetcher";
import { getUserProfile } from "@/lib/storage";
import { Game, GameCategory, GameTag, UserProfile } from "@/types";
import { AVAILABLE_TAGS } from "@/constants/tags";

const CATEGORIES: Array<GameCategory | "All"> = ["All", "Word Games", "Puzzles", "Strategy", "Trivia"];

export default function HomeScreen() {
  const { games, loading, refresh, updateGame, deleteGame } = useGames();
  const { scores } = useScores();
  const { syncing, lastSyncTime } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | "All">("All");
  const [selectedTags, setSelectedTags] = useState<GameTag[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const tintColor = useThemeColor({}, "tint");
  const backgroundColor = useThemeColor({}, "background");
  const cardBackground = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "cardBorder");
  const inputBackground = useThemeColor({ light: "#F9FAFB", dark: "#374151" }, "card");

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      const profile = await getUserProfile();
      setUserProfile(profile);
    };
    loadProfile();
  }, []);

  // Fetch logos for games that don't have them
  useEffect(() => {
    const fetchLogos = async () => {
      for (const game of games) {
        if (!game.logoUrl) {
          const logoUrl = await fetchGameLogo(game.url);
          if (logoUrl) {
            await updateGame(game.id, { logoUrl });
          }
        }
      }
    };
    if (games.length > 0) {
      fetchLogos();
    }
  }, [games.length]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleGamePress = (game: Game) => {
    console.log("[Home] Game pressed:", { gameId: game.id, gameName: game.name });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log("[Home] Navigating to game detail...");
    try {
      router.push({ pathname: "/game-detail" as any, params: { gameId: game.id } });
      console.log("[Home] Navigation initiated");
    } catch (error) {
      console.error("[Home] Navigation error:", error);
    }
  };

  const handleAddGame = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/add-game" as any);
  };

  const handleDeleteGame = (gameId: string, gameName: string) => {
    Alert.alert(
      "Delete Game",
      `Are you sure you want to delete "${gameName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteGame(gameId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const handleToggleFavorite = async (gameId: string, currentFavorite: boolean) => {
    await updateGame(gameId, { isFavorite: !currentFavorite });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Filter and sort games
  const filteredGames = useMemo(() => {
    let filtered = games;

    // Apply category filter
    if (selectedCategory !== "All") {
      filtered = filtered.filter((game) => game.category === selectedCategory);
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter((game) =>
        selectedTags.every((tag) => game.tags.includes(tag))
      );
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (game) =>
          game.name.toLowerCase().includes(query) ||
          game.category.toLowerCase().includes(query)
      );
    }

    // Sort: favorites first, then by name
    return filtered.sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [games, selectedCategory, selectedTags, searchQuery]);

  const favoriteGames = useMemo(() => {
    return games.filter((game) => game.isFavorite);
  }, [games]);

  const renderGame = ({ item }: { item: Game }) => (
        <GameCardSimple
      game={item}
      onPress={() => handleGamePress(item)}
      onDelete={() => handleDeleteGame(item.id, item.name)}
      onToggleFavorite={() => handleToggleFavorite(item.id, item.isFavorite)}
      isPlayedToday={wasPlayedToday(item)}
    />
  );

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const gamesPlayedToday = useMemo(() => {
    const today = new Date().toDateString();
    return games.filter(game => {
      const lastPlayed = game.playHistory?.[game.playHistory.length - 1];
      return lastPlayed && new Date(lastPlayed).toDateString() === today;
    }).length;
  }, [games]);

  const renderHeader = () => (
    <View style={styles.header}>
      {/* Welcome Message */}
      {userProfile && (
        <View style={[styles.welcomeCard, { backgroundColor: cardBackground, borderColor }]}>
          <View style={styles.welcomeHeader}>
            <View style={{ flex: 1 }}>
              <ThemedText type="subtitle" style={styles.welcomeGreeting}>
                {getGreeting()}, {userProfile.name}! 👋
              </ThemedText>
              <ThemedText style={styles.welcomeStats}>
                {gamesPlayedToday > 0 
                  ? `You've played ${gamesPlayedToday} ${gamesPlayedToday === 1 ? 'game' : 'games'} today`
                  : "Ready to play some games today?"}
              </ThemedText>
            </View>
            {syncing && (
              <View style={styles.syncIndicator}>
                <ActivityIndicator size="small" color={tintColor} />
                <ThemedText style={styles.syncText}>Syncing...</ThemedText>
              </View>
            )}
            {!syncing && lastSyncTime && (
              <ThemedText style={styles.syncText}>
                ✓ Synced
              </ThemedText>
            )}
          </View>
        </View>
      )}

      <ThemedText type="title" style={styles.mainTitle}>Daily Games Hub</ThemedText>
      <ThemedText style={styles.description}>
        Your central hub for daily puzzle games. Track scores, build streaks, and compete with friends across 24+ games.
      </ThemedText>
      <ThemedText style={styles.subtitle}>
        {filteredGames.length} {filteredGames.length === 1 ? "game" : "games"}
        {favoriteGames.length > 0 && ` · ${favoriteGames.length} ⭐`}
      </ThemedText>

      {/* Search bar */}
      <View style={[styles.searchContainer, { backgroundColor: inputBackground, borderColor }]}>
        <IconSymbol name="magnifyingglass" size={20} color={tintColor} />
        <TextInput
          style={[styles.searchInput, { color: useThemeColor({}, "text") }]}
          placeholder="Search games..."
          placeholderTextColor={useThemeColor({ light: "#9CA3AF", dark: "#6B7280" }, "icon")}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")}>
            <IconSymbol name="xmark.circle.fill" size={20} color={tintColor} />
          </Pressable>
        )}
      </View>

      {/* Category filters */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoriesContainer}
      >
        {CATEGORIES.map((category) => (
          <Pressable
            key={category}
            onPress={() => {
              setSelectedCategory(category);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={[
              styles.categoryChip,
              {
                backgroundColor:
                  selectedCategory === category ? tintColor : cardBackground,
                borderColor,
              },
            ]}
          >
            <ThemedText
              style={[
                styles.categoryChipText,
                { color: selectedCategory === category ? "#fff" : tintColor },
              ]}
            >
              {category}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Tag Filters */}
      {AVAILABLE_TAGS.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsContainer}
        >
          {AVAILABLE_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <Pressable
                key={tag}
                onPress={() => {
                  setSelectedTags((prev) =>
                    isSelected
                      ? prev.filter((t) => t !== tag)
                      : [...prev, tag]
                  );
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: isSelected ? tintColor : cardBackground,
                    borderColor: isSelected ? tintColor : borderColor,
                  },
                ]}
              >
                <ThemedText
                  style={[
                    styles.tagChipText,
                    { color: isSelected ? "#fff" : tintColor },
                  ]}
                >
                  {tag}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyText}>
        {searchQuery || selectedCategory !== "All"
          ? "No games found"
          : "No games yet"}
      </ThemedText>
      <ThemedText style={styles.emptySubtext}>
        {searchQuery || selectedCategory !== "All"
          ? "Try adjusting your filters"
          : "Tap the + button to add your first game"}
      </ThemedText>
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
        data={filteredGames}
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
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 20) + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating add button */}
      <Pressable
        onPress={handleAddGame}
        style={[
          styles.floatingButton,
          {
            backgroundColor: tintColor,
            bottom: Math.max(insets.bottom, 20) + 70,
          },
        ]}
      >
        <IconSymbol name="plus" size={28} color="#fff" />
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
    gap: 12,
  },
  welcomeCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  welcomeGreeting: {
    marginBottom: 4,
  },
  welcomeStats: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
  },
  welcomeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  syncIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  syncText: {
    fontSize: 12,
    opacity: 0.6,
  },
  mainTitle: {
    marginTop: 8,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    opacity: 0.7,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.6,
    marginTop: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  categoriesContainer: {
    gap: 8,
    paddingVertical: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  tagsContainer: {
    gap: 8,
    paddingVertical: 4,
    paddingBottom: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  tagChipText: {
    fontSize: 12,
    fontWeight: "500",
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 20,
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
  },
  floatingButton: {
    position: "absolute",
    right: 20,
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
