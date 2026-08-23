import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
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
import { daysBetween } from "@/lib/dates";
import { updateGameStreaks, wasPlayedToday } from "@/lib/streaks";
import type { Score, ScoreOrder } from "@/types";
import type { FriendLeaderboardEntry } from "@/types/friends";

const SCORE_ORDER_LABELS: Record<ScoreOrder, string> = {
  higher: "higher is better",
  lower: "lower is better",
  none: "unscored",
};

const SERIF = Fonts!.serif;
const SANS = Fonts!.sans;

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function GameDetailScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const { games, updateGame, refresh: refreshGames } = useGames();
  const { addScore, updateScore, deleteScore, getScoresByGame } = useScores();
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

  // Ledger entry being corrected (null = modal closed) + its draft fields.
  const [editing, setEditing] = useState<Score | null>(null);
  const [editResult, setEditResult] = useState<"win" | "loss" | "draw">("win");
  const [editScoreText, setEditScoreText] = useState("");
  const [editNote, setEditNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

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
      const entries = await getFriendLeaderboard(gameId, game?.scoreOrder);
      // Only worth showing when someone besides you is on the board
      setHeadToHead(entries.some((e) => !e.is_current_user) ? entries : []);
    } catch (err) {
      // Offline or backend unreachable: hide the section rather than error
      console.log("[GameDetail] Head-to-head unavailable:", err);
      setHeadToHead([]);
    }
  }, [gameId, game?.scoreOrder]);

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

  const openEdit = (score: Score) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setEditing(score);
    setEditResult(score.result);
    setEditScoreText(score.score !== undefined && score.score !== null ? String(score.score) : "");
    setEditNote(score.notes ?? "");
    setConfirmDelete(false);
  };

  const closeEdit = () => {
    setEditing(null);
    setConfirmDelete(false);
  };

  const handleSaveEdit = async () => {
    if (!editing || savingEdit) return;
    setSavingEdit(true);
    try {
      const parsed = editScoreText.trim() ? parseFloat(editScoreText) : undefined;
      const updated = await updateScore(editing.id, {
        result: editResult,
        score: parsed !== undefined && !Number.isNaN(parsed) ? parsed : undefined,
        notes: editNote.trim() || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await loadRecent();
      if (updated) {
        // Best-effort push; the merge sync's LWW picks it up otherwise.
        syncScoresToCloud([updated])
          .then(() => loadHeadToHead())
          .catch((err) => console.log("[GameDetail] Edit push failed:", err));
      }
      closeEdit();
    } catch (err) {
      console.error("Error updating score:", err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!editing || savingEdit) return;
    if (!confirmDelete) {
      // Web Alert.alert is a no-op, so confirmation is an in-place second tap.
      setConfirmDelete(true);
      return;
    }
    setSavingEdit(true);
    try {
      const result = await deleteScore(editing.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      await loadRecent();
      await refreshGames();
      if (result) {
        // Push the tombstone and the rebuilt game record together.
        syncScoresToCloud([result.score])
          .then(() => (result.game ? syncGamesToCloud([result.game]) : undefined))
          .then(() => loadHeadToHead())
          .catch((err) => console.log("[GameDetail] Delete push failed:", err));
      }
      closeEdit();
    } catch (err) {
      console.error("Error deleting score:", err);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCycleScoreOrder = async () => {
    if (!game) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const cycle: ScoreOrder[] = ["higher", "lower", "none"];
    const current = game.scoreOrder ?? "higher";
    const scoreOrder = cycle[(cycle.indexOf(current) + 1) % cycle.length];
    await updateGame(game.id, { scoreOrder });
    syncGamesToCloud([{ ...game, scoreOrder, updatedAt: Date.now() }]).catch((err) =>
      console.log("[GameDetail] Score order push failed:", err)
    );
  };

  const handleToggleFavorite = async () => {
    if (!game) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const isFavorite = !game.isFavorite;
    await updateGame(game.id, { isFavorite });
    // Best-effort push so the other device picks the change up promptly;
    // local storage remains the source of truth.
    syncGamesToCloud([{ ...game, isFavorite, updatedAt: Date.now() }]).catch((err) =>
      console.log("[GameDetail] Favourite push failed:", err)
    );
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
        .then(() => syncGamesToCloud([{ ...game, ...updated, updatedAt: Date.now() }]))
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
          <Pressable
            onPress={handleToggleFavorite}
            hitSlop={10}
            style={({ pressed }) => ({
              width: 36,
              alignItems: "flex-end" as const,
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text
              style={{
                fontSize: 18,
                color: game.isFavorite ? palette.tint : palette.muted,
              }}
              allowFontScaling={false}
            >
              {game.isFavorite ? "★" : "☆"}
            </Text>
          </Pressable>
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
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 14,
            }}
          >
            <Text
              style={[
                styles.sectionLabel,
                { color: palette.muted, fontFamily: SERIF },
              ]}
            >
              § Log Today
            </Text>
            <Pressable onPress={handleCycleScoreOrder} hitSlop={8}>
              <Text
                style={{
                  fontSize: 11,
                  fontStyle: "italic",
                  color: palette.muted,
                  fontFamily: SERIF,
                }}
              >
                scoring:{" "}
                <Text style={{ color: palette.text }}>
                  {SCORE_ORDER_LABELS[game.scoreOrder ?? "higher"]}
                </Text>
              </Text>
            </Pressable>
          </View>

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
            <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
              <Text
                style={[
                  styles.sectionLabel,
                  { color: palette.muted, fontFamily: SERIF },
                ]}
              >
                § Ledger
              </Text>
              <Text
                style={{
                  fontSize: 11,
                  fontStyle: "italic",
                  color: palette.muted,
                  fontFamily: SERIF,
                }}
              >
                tap an entry to amend
              </Text>
            </View>
            {recentScores.map((s, i) => (
              <Pressable
                key={s.id}
                onPress={() => openEdit(s)}
                style={({ pressed }) => [
                  styles.ledgerRow,
                  {
                    opacity: pressed ? 0.6 : 1,
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
              </Pressable>
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

      {/* Amend-entry modal */}
      <Modal
        visible={editing !== null}
        transparent
        animationType="fade"
        onRequestClose={closeEdit}
      >
        <View style={styles.editOverlay}>
          <View
            style={[
              styles.editCard,
              { backgroundColor: palette.surface, borderColor: palette.hairline },
            ]}
          >
            <Text style={[styles.editEyebrow, { color: palette.tint, fontFamily: SERIF }]}>
              — Amend entry —
            </Text>
            <Text style={[styles.editTitle, { color: palette.text, fontFamily: SERIF }]}>
              {editing ? ledgerLabel(new Date(editing.datePlayed)) : ""}
            </Text>

            <View style={[styles.tabRow, { borderBottomColor: palette.hairline }]}>
              {(["win", "loss", "draw"] as const).map((r) => {
                const isActive = editResult === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setEditResult(r);
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
              value={editScoreText}
              onChangeText={setEditScoreText}
              placeholder="Score — e.g. 3/6"
              placeholderTextColor={palette.muted}
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
              value={editNote}
              onChangeText={setEditNote}
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
              onPress={handleSaveEdit}
              disabled={savingEdit}
              style={({ pressed }) => [
                styles.editSave,
                {
                  backgroundColor: palette.ink,
                  opacity: pressed || savingEdit ? 0.7 : 1,
                },
              ]}
            >
              <Text style={[styles.editSaveLabel, { color: palette.bg, fontFamily: SANS }]}>
                Save changes
              </Text>
            </Pressable>

            <View style={styles.editFooter}>
              <Pressable onPress={closeEdit} hitSlop={8} disabled={savingEdit}>
                <Text
                  style={{
                    fontFamily: SERIF,
                    fontStyle: "italic",
                    fontSize: 13,
                    color: palette.muted,
                  }}
                >
                  cancel
                </Text>
              </Pressable>
              <Pressable onPress={handleDeleteEntry} hitSlop={8} disabled={savingEdit}>
                <Text
                  style={{
                    fontFamily: SERIF,
                    fontStyle: "italic",
                    fontSize: 13,
                    fontWeight: confirmDelete ? "700" : "400",
                    color: palette.loss,
                  }}
                >
                  {confirmDelete ? "tap again to delete" : "delete entry"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

function ledgerLabel(date: Date): string {
  const diff = daysBetween(date.getTime(), Date.now());
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
  editOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  editCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 4,
    borderWidth: 1,
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 18,
  },
  editEyebrow: {
    fontSize: 11,
    fontStyle: "italic",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  editTitle: {
    fontSize: 24,
    fontWeight: "500",
    letterSpacing: -0.5,
    marginBottom: 14,
  },
  editSave: {
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 18,
  },
  editSaveLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  editFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
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
