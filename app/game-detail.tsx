import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as Haptics from "expo-haptics";

import { GameGlyph } from "@/components/game-glyph";
import { StreakGrid, buildHistoryDays } from "@/components/streak-grid";
import { ThemedView } from "@/components/themed-view";
import { Colors, Fonts } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useGames, useScores } from "@/hooks/use-storage";
import { getFriendLeaderboard } from "@/lib/friends";
import { syncGamesToCloud, syncScoresToCloud } from "@/lib/sync";
import { updateGameStreaks, wasPlayedToday } from "@/lib/streaks";
import type { Score } from "@/types";
import type { FriendLeaderboardEntry } from "@/types/friends";

const SERIF = Fonts!.serif;
const SANS = Fonts!.sans;

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function GameDetailScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const { games, updateGame } = useGames();
  const { addScore, getScoresByGame } = useScores();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];

  const game = games.find((g) => g.id === gameId);
  const playedToday = game ? wasPlayedToday(game) : false;

  const [recentScores, setRecentScores] = useState<Score[]>([]);
  const [tab, setTab] = useState<"win" | "loss" | "draw">("win");
  const [scoreText, setScoreText] = useState("");
  const [note, setNote] = useState("");
  const [logged, setLogged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [headToHead, setHeadToHead] = useState<FriendLeaderboardEntry[]>([]);

  const loadRecent = useCallback(async () => {
    if (!gameId) return;
    const scores = await getScoresByGame(gameId);
    setRecentScores(scores.slice(0, 7));
  }, [gameId, getScoresByGame]);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  const loadHeadToHead = useCallback(async () => {
    if (!gameId) return;
    try {
      const entries = await getFriendLeaderboard(gameId);
      // Only worth showing when someone besides you is on the board
      setHeadToHead(entries.some((e) => !e.is_current_user) ? entries : []);
    } catch (err) {
      // Offline or backend unreachable: hide the section rather than error
      console.log("[GameDetail] Head-to-head unavailable:", err);
      setHeadToHead([]);
    }
  }, [gameId]);

  useEffect(() => {
    loadHeadToHead();
  }, [loadHeadToHead]);

  const history = useMemo(
    () => (game ? buildHistoryDays(game.playHistory, 70) : []),
    [game]
  );

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.back();
  };

  const handlePlay = async () => {
    if (!game) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    try {
      await WebBrowser.openBrowserAsync(game.url, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
        controlsColor: palette.tint,
      });
    } catch (err) {
      console.error("Error opening game:", err);
    }
  };

  const handleSubmit = async () => {
    if (!game || submitting) return;
    setSubmitting(true);
    try {
      const parsed = scoreText.trim() ? parseFloat(scoreText) : undefined;
      const now = Date.now();
      const score: Score = {
        id: `${now}-${Math.random()}`,
        gameId: game.id,
        ...(parsed !== undefined && !Number.isNaN(parsed) ? { score: parsed } : {}),
        result: tab,
        datePlayed: now,
        notes: note.trim() || undefined,
      };
      await addScore(score);

      // Optimistically refresh the streak count on the game record so the
      // big numeral updates without a hard reload.
      const updated = updateGameStreaks(game, now);
      await updateGame(game.id, {
        playHistory: updated.playHistory,
        currentStreak: updated.currentStreak,
        longestStreak: updated.longestStreak,
        lastPlayed: updated.lastPlayed,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
        () => {}
      );
      await loadRecent();

      // Push this play to the backend right away so the other player's
      // head-to-head is fresh; the periodic sync would only catch it on the
      // next app start. Best-effort — local storage is the source of truth.
      syncScoresToCloud([score])
        .then(() => syncGamesToCloud([{ ...game, ...updated }]))
        .then(() => loadHeadToHead())
        .catch((err) => console.log("[GameDetail] Background push failed:", err));

      setLogged(true);
      setTimeout(() => setLogged(false), 1800);
      setScoreText("");
      setNote("");
      setTab("win");
    } catch (err) {
      console.error("Error logging score:", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!game) {
    return (
      <ThemedView style={[styles.container, styles.center]}>
        <Text style={{ color: palette.text, fontFamily: SERIF, fontSize: 18 }}>
          Game not found
        </Text>
        <Pressable onPress={handleBack} hitSlop={10} style={{ marginTop: 16 }}>
          <Text style={{ color: palette.muted, fontFamily: SERIF, fontStyle: "italic" }}>
            ‹ back
          </Text>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingBottom: Math.max(insets.bottom, 20) + 140,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Top bar */}
        <View
          style={[
            styles.topBar,
            { paddingTop: Math.max(insets.top, 20) + 40 },
          ]}
        >
          <Pressable
            onPress={handleBack}
            hitSlop={10}
            style={({ pressed }) => [
              styles.back,
              { opacity: pressed ? 0.6 : 1 },
            ]}
          >
            <Text
              style={{
                color: palette.muted,
                fontFamily: SERIF,
                fontStyle: "italic",
                fontSize: 13,
              }}
            >
              ‹ back
            </Text>
          </Pressable>
          <Text
            style={{
              fontSize: 11,
              color: palette.muted,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              fontFamily: SANS,
            }}
          >
            {game.category}
          </Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Hero masthead */}
        <View
          style={[
            styles.heroMasthead,
            { borderBottomColor: palette.hairline },
          ]}
        >
          <GameGlyph game={game} size={56} radius={6} />
          <Text
            style={[
              styles.heroName,
              { color: palette.text, fontFamily: SERIF },
            ]}
            allowFontScaling={false}
          >
            {game.name}
          </Text>
          <Text
            style={[
              styles.heroMeta,
              { color: palette.muted, fontFamily: SERIF },
            ]}
            numberOfLines={1}
          >
            {game.url} · {game.playHistory.length} lifetime plays
          </Text>
        </View>

        {/* Current streak stat */}
        <View style={styles.statBlock}>
          <Text
            style={[
              styles.statEyebrow,
              { color: palette.tint, fontFamily: SERIF },
            ]}
          >
            — Current streak —
          </Text>
          <Text
            style={[
              styles.statNumber,
              { color: palette.tint, fontFamily: SERIF },
            ]}
            allowFontScaling={false}
          >
            {game.currentStreak}
          </Text>
          <View style={styles.statCaption}>
            <Text style={{ color: palette.muted, fontSize: 13, fontFamily: SANS }}>
              consecutive days played
            </Text>
            <View
              style={{
                width: 3,
                height: 3,
                borderRadius: 2,
                backgroundColor: palette.muted,
                opacity: 0.5,
              }}
            />
            <Text style={{ color: palette.muted, fontSize: 13, fontFamily: SANS }}>
              personal best{" "}
              <Text style={{ color: palette.text, fontWeight: "500" }}>
                {game.longestStreak}
              </Text>
            </Text>
          </View>
        </View>

        {/* Play CTA */}
        <View style={styles.ctaWrap}>
          <Pressable
            onPress={handlePlay}
            style={({ pressed }) => [
              styles.cta,
              {
                backgroundColor: palette.ink,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.ctaLabel,
                { color: palette.bg, fontFamily: SANS },
              ]}
            >
              {playedToday ? "Play again" : `Open ${game.name}`}
            </Text>
          </Pressable>
        </View>

        {/* § History */}
        <View style={styles.historyBlock}>
          <View style={styles.sectionRule}>
            <Text
              style={[styles.sectionLabel, { color: palette.muted, fontFamily: SERIF }]}
            >
              § History
            </Text>
            <View
              style={{
                flex: 1,
                height: StyleSheet.hairlineWidth,
                backgroundColor: palette.hairline,
                marginHorizontal: 10,
              }}
            />
            <Text style={{ fontSize: 11, color: palette.muted, fontFamily: SANS }}>
              ten weeks
            </Text>
          </View>
          <StreakGrid
            history={history}
            accent={palette.tint}
            dark={scheme === "dark"}
            cell={16}
            gap={4}
          />
        </View>

        {/* § Log Today */}
        <View
          style={[
            styles.logBlock,
            { borderTopColor: palette.hairline },
          ]}
        >
          <Text
            style={[
              styles.sectionLabel,
              { color: palette.muted, fontFamily: SERIF, marginBottom: 14 },
            ]}
          >
            § Log Today
          </Text>

          <View
            style={[
              styles.tabRow,
              { borderBottomColor: palette.hairline },
            ]}
          >
            {(["win", "loss", "draw"] as const).map((r) => {
              const isActive = tab === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(
                      () => {}
                    );
                    setTab(r);
                  }}
                  style={({ pressed }) => [
                    styles.tabButton,
                    {
                      borderBottomColor: isActive ? palette.tint : "transparent",
                      opacity: pressed ? 0.7 : 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isActive ? palette.text : palette.muted,
                      fontSize: 13,
                      fontWeight: "600",
                      letterSpacing: 1,
                      textTransform: "uppercase",
                      fontFamily: SANS,
                    }}
                  >
                    {r}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={scoreText}
            onChangeText={setScoreText}
            placeholder="Score — e.g. 3/6"
            placeholderTextColor={palette.muted}
            keyboardType="default"
            style={[
              styles.fieldInput,
              {
                color: palette.text,
                borderBottomColor: palette.hairline,
                fontFamily: SERIF,
                fontSize: 18,
              },
            ]}
          />
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="A note, a memory…"
            placeholderTextColor={palette.muted}
            style={[
              styles.fieldInput,
              {
                color: palette.text,
                borderBottomColor: palette.hairline,
                fontFamily: SERIF,
                fontSize: 16,
                fontStyle: "italic",
              },
            ]}
          />

          <Pressable
            onPress={handleSubmit}
            disabled={submitting}
            style={({ pressed }) => [
              styles.submit,
              {
                backgroundColor: logged ? palette.success : palette.tint,
                opacity: pressed || submitting ? 0.8 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.submitLabel,
                { fontFamily: SANS },
              ]}
            >
              {logged ? "✓ Logged" : "Log it"}
            </Text>
          </Pressable>
        </View>

        {/* § Ledger */}
        {recentScores.length > 0 ? (
          <View
            style={[
              styles.ledgerBlock,
              { borderTopColor: palette.hairline },
            ]}
          >
            <Text
              style={[
                styles.sectionLabel,
                { color: palette.muted, fontFamily: SERIF, marginBottom: 14 },
              ]}
            >
              § Ledger
            </Text>
            {recentScores.map((s, i) => (
              <View
                key={s.id}
                style={[
                  styles.ledgerRow,
                  {
                    borderBottomWidth:
                      i === recentScores.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: palette.hairline,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: SERIF,
                    fontSize: 14,
                    fontStyle: "italic",
                    color: palette.muted,
                    minWidth: 110,
                  }}
                >
                  {ledgerLabel(new Date(s.datePlayed))}
                </Text>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: SERIF,
                    fontSize: 18,
                    fontWeight: "500",
                    letterSpacing: -0.2,
                    color: palette.text,
                  }}
                >
                  {s.score !== undefined && s.score !== null
                    ? String(s.score)
                    : s.notes || "—"}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    color: s.result === "win" ? palette.success : s.result === "loss" ? palette.loss : palette.muted,
                    fontFamily: SANS,
                  }}
                >
                  {s.result}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* § Head to Head */}
        {headToHead.length > 0 ? (
          <View
            style={[
              styles.ledgerBlock,
              { borderTopColor: palette.hairline },
            ]}
          >
            <Text
              style={[
                styles.sectionLabel,
                { color: palette.muted, fontFamily: SERIF, marginBottom: 14 },
              ]}
            >
              § Head to Head
            </Text>
            {headToHead.map((entry, i) => (
              <View
                key={entry.user_id}
                style={[
                  styles.ledgerRow,
                  {
                    borderBottomWidth:
                      i === headToHead.length - 1 ? 0 : StyleSheet.hairlineWidth,
                    borderBottomColor: palette.hairline,
                  },
                ]}
              >
                <Text
                  style={{
                    fontFamily: SERIF,
                    fontSize: 14,
                    fontStyle: "italic",
                    color: palette.muted,
                    minWidth: 32,
                  }}
                >
                  {entry.rank}.
                </Text>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: SERIF,
                    fontSize: 18,
                    fontWeight: entry.is_current_user ? "700" : "500",
                    letterSpacing: -0.2,
                    color: entry.is_current_user ? palette.tint : palette.text,
                  }}
                  numberOfLines={1}
                >
                  {entry.name}
                </Text>
                <Text
                  style={{
                    fontFamily: SERIF,
                    fontSize: 18,
                    fontWeight: "500",
                    color: palette.text,
                  }}
                >
                  {Number.isFinite(entry.best_score) ? String(entry.best_score) : "—"}
                </Text>
                <Text
                  style={{
                    fontSize: 10,
                    fontWeight: "700",
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    color: palette.muted,
                    fontFamily: SANS,
                    minWidth: 60,
                    textAlign: "right",
                  }}
                >
                  {entry.total_plays} {entry.total_plays === 1 ? "play" : "plays"}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

function ledgerLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const that = new Date(date);
  that.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  const diff = Math.round((today.getTime() - that.getTime()) / dayMs);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  const dow = DOW[date.getDay()];
  const monthDay = date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${dow} · ${monthDay}`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  back: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroMasthead: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  heroName: {
    fontSize: 48,
    fontWeight: "500",
    letterSpacing: -1.4,
    lineHeight: 48 * 0.98,
    marginTop: 16,
  },
  heroMeta: {
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 8,
  },
  statBlock: {
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  statEyebrow: {
    fontSize: 11,
    fontStyle: "italic",
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  statNumber: {
    fontSize: 120,
    fontWeight: "500",
    letterSpacing: -4,
    lineHeight: 120 * 0.82,
    includeFontPadding: false,
    marginBottom: 4,
  },
  statCaption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 12,
  },
  ctaWrap: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 8,
  },
  cta: {
    height: 52,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  historyBlock: {
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  sectionRule: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionLabel: {
    fontSize: 11,
    fontStyle: "italic",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  logBlock: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabRow: {
    flexDirection: "row",
    marginBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    flex: 1,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 2,
    marginBottom: -StyleSheet.hairlineWidth,
  },
  fieldInput: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 8,
  },
  submit: {
    height: 46,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  submitLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  ledgerBlock: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  ledgerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 14,
    paddingVertical: 11,
  },
});
