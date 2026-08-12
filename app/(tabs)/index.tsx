import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { GameGlyph } from "@/components/game-glyph";
import { StreakGrid, buildHistoryDays } from "@/components/streak-grid";
import { ThemedView } from "@/components/themed-view";
import { Colors, Fonts, streakColor, type Palette } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useGames } from "@/hooks/use-storage";
import { filterAndSortLibrary, libraryCategories } from "@/lib/library";
import { fetchGameLogo } from "@/lib/logo-fetcher";
import { wasPlayedToday } from "@/lib/streaks";
import type { Game } from "@/types";

const SERIF = Fonts!.serif;
const SANS = Fonts!.sans;

type GameWithFlag = Game & { playedToday: boolean };

type SearchIconProps = { color: string; size?: number };
function SearchIcon({ color, size = 16 }: SearchIconProps) {
  // Tiny inline glyph using two views — no external icon dep, scales fine.
  const ringSize = size * 0.7;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View
        style={{
          width: ringSize,
          height: ringSize,
          borderRadius: ringSize / 2,
          borderWidth: 1.5,
          borderColor: color,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: 0,
          bottom: 0,
          width: size * 0.32,
          height: 1.5,
          backgroundColor: color,
          transform: [{ rotate: "45deg" }],
        }}
      />
    </View>
  );
}

export default function HomeScreen() {
  const { games, loading, refresh, updateGame } = useGames();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  // Reload from storage whenever the screen regains focus — plays logged in
  // the game-detail modal land in AsyncStorage via a different useGames
  // instance, so this one's copy is stale by the time we navigate back.
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  // Best-effort logo backfill (kept from original implementation).
  const gamesMissingLogos = useMemo(
    () => games.filter((g) => !g.logoUrl),
    [games]
  );
  useEffect(() => {
    if (gamesMissingLogos.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const game of gamesMissingLogos) {
        if (cancelled) return;
        const logoUrl = await fetchGameLogo(game.url);
        if (logoUrl && !cancelled) {
          await updateGame(game.id, { logoUrl });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [gamesMissingLogos, updateGame]);

  const enriched: GameWithFlag[] = useMemo(
    () => games.map((g) => ({ ...g, playedToday: wasPlayedToday(g) })),
    [games]
  );

  const active = useMemo(
    () =>
      enriched
        .filter((g) => g.currentStreak > 0)
        .sort((a, b) => b.currentStreak - a.currentStreak),
    [enriched]
  );
  const top = active[0];
  const unplayedToday = useMemo(
    () => enriched.filter((g) => !g.playedToday).length,
    [enriched]
  );

  const categories = useMemo(() => libraryCategories(games), [games]);

  const filtered = useMemo(
    () => filterAndSortLibrary(enriched, { query, category }),
    [enriched, query, category]
  );

  const handleOpenGame = useCallback(
    (gameId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      router.push({ pathname: "/game-detail" as any, params: { gameId } });
    },
    [router]
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const renderGame = useCallback(
    ({ item, index }: { item: GameWithFlag; index: number }) => (
      <GameRow
        game={item}
        palette={palette}
        isLast={index === filtered.length - 1}
        onPress={() => handleOpenGame(item.id)}
      />
    ),
    [filtered.length, handleOpenGame, palette]
  );

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={palette.tint} />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(g) => g.id}
        renderItem={renderGame}
        ListHeaderComponent={
          <Header
            top={top}
            active={active}
            unplayedToday={unplayedToday}
            filteredCount={filtered.length}
            query={query}
            onQueryChange={setQuery}
            categories={categories}
            category={category}
            onCategoryChange={setCategory}
            onOpenGame={handleOpenGame}
            palette={palette}
            scheme={scheme}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={[styles.emptyTitle, { color: palette.text }]}>
              {query || category ? "No matches" : "No games yet"}
            </Text>
            <Text style={[styles.emptyBody, { color: palette.muted }]}>
              {query || category
                ? "Try a different name or category."
                : "Add a game from the + button to start a streak."}
            </Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={palette.tint}
          />
        }
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 20) + 140,
          paddingHorizontal: 0,
        }}
        showsVerticalScrollIndicator={false}
      />
    </ThemedView>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Header (masthead + streak hero + search + section rule)
// ──────────────────────────────────────────────────────────────────────────

type HeaderProps = {
  top?: GameWithFlag;
  active: GameWithFlag[];
  unplayedToday: number;
  filteredCount: number;
  query: string;
  onQueryChange: (v: string) => void;
  categories: string[];
  category: string | null;
  onCategoryChange: (v: string | null) => void;
  onOpenGame: (id: string) => void;
  palette: Palette;
  scheme: "light" | "dark";
};

function Header({
  top,
  active,
  unplayedToday,
  filteredCount,
  query,
  onQueryChange,
  categories,
  category,
  onCategoryChange,
  onOpenGame,
  palette,
  scheme,
}: HeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View>
      {/* Status-bar spacer (60px in spec, plus safe-area top) */}
      <View style={{ height: Math.max(insets.top, 20) + 40 }} />

      {/* Masthead */}
      <View
        style={[
          styles.masthead,
          { borderBottomColor: palette.hairline },
        ]}
      >
        <Text
          style={[
            styles.wordmarkLine,
            { color: palette.text, fontFamily: SERIF },
          ]}
          allowFontScaling={false}
        >
          The Daily
        </Text>
        <Text
          style={[
            styles.wordmarkLine,
            styles.wordmarkItalic,
            { color: palette.text, fontFamily: SERIF },
          ]}
          allowFontScaling={false}
        >
          Games
        </Text>
        <Text
          style={[
            styles.subhead,
            { color: palette.muted, fontFamily: SANS },
          ]}
        >
          {unplayedToday} games left today.
          {top ? (
            <>
              {"  "}Longest streak alive —{" "}
              <Text style={{ color: palette.text, fontWeight: "500" }}>
                {top.currentStreak} days
              </Text>{" "}
              of {top.name}.
            </>
          ) : null}
        </Text>
      </View>

      {/* Streak hero card */}
      {top ? (
        <StreakHero
          top={top}
          others={active.slice(1)}
          palette={palette}
          scheme={scheme}
          onOpenGame={onOpenGame}
        />
      ) : null}

      {/* Search */}
      <View style={styles.searchWrap}>
        <View
          style={[
            styles.searchInner,
            { borderBottomColor: palette.hairline },
          ]}
        >
          <SearchIcon color={palette.muted} />
          <TextInput
            value={query}
            onChangeText={onQueryChange}
            placeholder="Search the library"
            placeholderTextColor={palette.muted}
            style={{
              flex: 1,
              color: palette.text,
              fontSize: 15,
              fontFamily: SERIF,
              fontStyle: query ? "normal" : "italic",
              paddingVertical: 0,
            }}
          />
        </View>
      </View>

      {/* Category filter chips */}
      {categories.length > 1 ? (
        <View style={styles.chipRow}>
          {[null, ...categories].map((c) => {
            const selected = category === c;
            return (
              <Pressable
                key={c ?? "all"}
                onPress={() => onCategoryChange(selected ? null : c)}
                hitSlop={4}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    borderColor: palette.hairline,
                    backgroundColor: selected ? palette.ink : "transparent",
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 11,
                    letterSpacing: 0.6,
                    textTransform: "uppercase",
                    fontFamily: SANS,
                    color: selected ? palette.bg : palette.muted,
                  }}
                  allowFontScaling={false}
                >
                  {c ?? "All"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {/* § Library section rule */}
      <View style={styles.sectionRule}>
        <Text
          style={[
            styles.sectionLabel,
            { color: palette.muted, fontFamily: SERIF },
          ]}
        >
          § Library
        </Text>
        <View
          style={{
            flex: 1,
            height: StyleSheet.hairlineWidth,
            backgroundColor: palette.hairline,
            marginHorizontal: 12,
          }}
        />
        <Text
          style={{
            fontSize: 11,
            color: palette.muted,
            letterSpacing: 0.3,
            fontFamily: SANS,
          }}
        >
          {filteredCount} {filteredCount === 1 ? "title" : "titles"}
        </Text>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Streak hero card
// ──────────────────────────────────────────────────────────────────────────

type StreakHeroProps = {
  top: GameWithFlag;
  others: GameWithFlag[];
  palette: Palette;
  scheme: "light" | "dark";
  onOpenGame: (id: string) => void;
};

function StreakHero({
  top,
  others,
  palette,
  scheme,
  onOpenGame,
}: StreakHeroProps) {
  const history = useMemo(() => buildHistoryDays(top.playHistory, 70), [top.playHistory]);
  return (
    <View
      style={[
        styles.heroCard,
        {
          backgroundColor: palette.surface,
          borderColor: palette.hairline,
        },
      ]}
    >
      <Pressable
        onPress={() => onOpenGame(top.id)}
        style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      >
        <Text
          style={[
            styles.heroEyebrow,
            { color: palette.tint, fontFamily: SERIF },
          ]}
        >
          — Longest active streak —
        </Text>
        <Text
          style={[
            styles.heroGameName,
            { color: palette.text, fontFamily: SERIF },
          ]}
        >
          {top.name}
        </Text>
        <Text
          style={[
            styles.heroBest,
            { color: palette.muted, fontFamily: SANS },
          ]}
        >
          Best ever · {top.longestStreak} days
        </Text>

        <View style={styles.heroNumberRow}>
          <Text
            style={[
              styles.heroNumber,
              { color: palette.tint, fontFamily: SERIF },
            ]}
            allowFontScaling={false}
          >
            {top.currentStreak}
          </Text>
          <Text
            style={[
              styles.heroNumberLabel,
              { color: palette.muted, fontFamily: SANS },
            ]}
          >
            DAYS RUNNING
          </Text>
        </View>

        <StreakGrid
          history={history}
          accent={palette.tint}
          dark={scheme === "dark"}
          cell={11}
          gap={3}
        />
      </Pressable>

      {others.length > 0 ? (
        <View
          style={[
            styles.heroRibbon,
            { borderTopColor: palette.hairline },
          ]}
        >
          <Text
            style={[
              styles.heroRibbonLabel,
              { color: palette.muted, fontFamily: SERIF },
            ]}
          >
            and {others.length} more —
          </Text>
          <View style={styles.heroChips}>
            {others.map((g) => {
              const color = streakColor(g.currentStreak, g.playedToday, palette);
              return (
                <Pressable
                  key={g.id}
                  onPress={() => onOpenGame(g.id)}
                  hitSlop={6}
                  style={({ pressed }) => [
                    styles.heroChip,
                    { opacity: pressed ? 0.7 : 1 },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      color: palette.muted,
                      fontFamily: SANS,
                    }}
                  >
                    {g.name}
                  </Text>
                  <Text
                    style={{
                      fontFamily: SERIF,
                      fontSize: 15,
                      fontWeight: "500",
                      color,
                      letterSpacing: -0.2,
                    }}
                    allowFontScaling={false}
                  >
                    {g.currentStreak}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Game row (library list item)
// ──────────────────────────────────────────────────────────────────────────

type GameRowProps = {
  game: GameWithFlag;
  palette: Palette;
  isLast: boolean;
  onPress: () => void;
};

function GameRow({ game, palette, isLast, onPress }: GameRowProps) {
  const color = streakColor(game.currentStreak, game.playedToday, palette);
  const lastPlayedLabel = formatLastPlayed(game);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          opacity: pressed ? 0.6 : game.playedToday ? 0.85 : 1,
          borderBottomColor: palette.hairline,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <GameGlyph game={game} size={44} radius={6} />
      <View style={styles.rowMain}>
        <Text
          numberOfLines={1}
          style={[
            styles.rowTitle,
            {
              color: palette.text,
              fontFamily: SERIF,
              textDecorationLine: game.playedToday ? "line-through" : "none",
              textDecorationColor: palette.muted,
            },
          ]}
        >
          {game.isFavorite ? (
            <Text style={{ color: palette.tint }} allowFontScaling={false}>
              {"★ "}
            </Text>
          ) : null}
          {game.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[
            styles.rowSubtitle,
            { color: palette.muted, fontFamily: SERIF },
          ]}
        >
          {game.category} — {lastPlayedLabel}
        </Text>
      </View>
      <View style={styles.rowRight}>
        {game.currentStreak > 0 ? (
          <>
            <Text
              style={[
                styles.rowStreakValue,
                { color, fontFamily: SERIF },
              ]}
              allowFontScaling={false}
            >
              {game.currentStreak}
            </Text>
            <Text
              style={[
                styles.rowStreakLabel,
                { color: palette.muted, fontFamily: SANS },
              ]}
            >
              DAYS
            </Text>
          </>
        ) : (
          <Text
            style={{
              fontFamily: SERIF,
              fontSize: 18,
              color: palette.muted,
              letterSpacing: -0.2,
            }}
            allowFontScaling={false}
          >
            —
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function formatLastPlayed(game: GameWithFlag): string {
  if (game.playedToday) return "today";
  if (!game.lastPlayed) return "never played";
  const days = Math.floor(
    (Date.now() - game.lastPlayed) / (24 * 60 * 60 * 1000)
  );
  if (days <= 0) return "today";
  if (days === 1) return "last played yesterday";
  if (days < 7) return `last played ${days} days ago`;
  const d = new Date(game.lastPlayed);
  return `last played ${d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })}`;
}

// ──────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  masthead: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 28,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  wordmarkLine: {
    fontSize: 44,
    fontWeight: "500",
    letterSpacing: -1.2,
    lineHeight: 44 * 0.96,
  },
  wordmarkItalic: {
    fontStyle: "italic",
    fontWeight: "400",
    marginBottom: 14,
  },
  subhead: {
    fontSize: 14,
    lineHeight: 21,
  },
  heroCard: {
    marginTop: 24,
    marginHorizontal: 24,
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 20,
    borderRadius: 4,
    borderWidth: 1,
  },
  heroEyebrow: {
    fontSize: 11,
    fontStyle: "italic",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  heroGameName: {
    fontSize: 26,
    fontWeight: "500",
    letterSpacing: -0.6,
    lineHeight: 26 * 1.1,
    marginBottom: 2,
  },
  heroBest: {
    fontSize: 12,
    marginBottom: 18,
  },
  heroNumberRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 18,
  },
  heroNumber: {
    fontSize: 84,
    fontWeight: "500",
    letterSpacing: -2.5,
    lineHeight: 84 * 0.85,
    includeFontPadding: false,
  },
  heroNumberLabel: {
    fontSize: 11,
    letterSpacing: 1.2,
    marginLeft: 10,
    marginBottom: 6,
  },
  heroRibbon: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    // Note: dotted hairline would use borderStyle: 'dotted' but RN's dotted
    // borders are flaky on Android. The solid hairline reads close enough.
  },
  heroRibbonLabel: {
    fontSize: 11,
    fontStyle: "italic",
    marginBottom: 10,
  },
  heroChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  heroChip: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  searchWrap: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  searchInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  sectionRule: {
    paddingTop: 28,
    paddingBottom: 12,
    paddingHorizontal: 24,
    flexDirection: "row",
    alignItems: "center",
  },
  sectionLabel: {
    fontSize: 11,
    fontStyle: "italic",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
    marginHorizontal: 24,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    fontSize: 20,
    fontWeight: "500",
    letterSpacing: -0.4,
    lineHeight: 22,
    marginBottom: 4,
  },
  rowSubtitle: {
    fontSize: 12,
    fontStyle: "italic",
  },
  rowRight: {
    minWidth: 48,
    alignItems: "flex-end",
  },
  rowStreakValue: {
    fontSize: 24,
    fontWeight: "500",
    letterSpacing: -0.5,
    lineHeight: 24,
    includeFontPadding: false,
  },
  rowStreakLabel: {
    fontSize: 10,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  emptyWrap: {
    paddingTop: 60,
    paddingHorizontal: 32,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    fontFamily: SERIF,
  },
  emptyBody: {
    fontSize: 14,
    textAlign: "center",
    fontFamily: SANS,
  },
});
