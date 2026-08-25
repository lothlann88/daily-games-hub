import { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { FeedbackBanner, type FeedbackState } from "@/components/feedback-banner";
import { useThemeColor } from "@/hooks/use-theme-color";
import * as friendsLib from "@/lib/friends";
import type { Friend, FriendRequestWithProfile } from "@/types/friends";

export default function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequestWithProfile[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [pendingRemoval, setPendingRemoval] = useState<Friend | null>(null);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "cardBorder");

  const loadData = useCallback(async () => {
    try {
      console.log("[Friends] Starting to load friends data...");
      
      const [friendsData, incomingData, outgoingData] = await Promise.all([
        friendsLib.getFriends(),
        friendsLib.getIncomingFriendRequests(),
        friendsLib.getOutgoingFriendRequests(),
      ]);

      console.log("[Friends] Data loaded:", {
        friendsCount: friendsData.length,
        incomingCount: incomingData.length,
        outgoingCount: outgoingData.length,
      });

      setFriends(friendsData);
      setIncomingRequests(incomingData);
      setOutgoingRequests(outgoingData);
    } catch (error: any) {
      console.error("[Friends] Error loading friends data:", error);
      setFeedback({
        tone: "error",
        message: "Couldn't load your friends. Pull down to try again.",
      });
    } finally {
      console.log("[Friends] Load complete, setting loading to false");
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      setProcessingRequestId(requestId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await friendsLib.acceptFriendRequest(requestId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadData();
    } catch (error) {
      console.error("Error accepting friend request:", error);
      setFeedback({ tone: "error", message: "Couldn't accept that request. Please try again." });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      setProcessingRequestId(requestId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await friendsLib.rejectFriendRequest(requestId);
      await loadData();
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      setFeedback({ tone: "error", message: "Couldn't reject that request. Please try again." });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      setProcessingRequestId(requestId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await friendsLib.cancelFriendRequest(requestId);
      await loadData();
    } catch (error) {
      console.error("Error canceling friend request:", error);
      setFeedback({ tone: "error", message: "Couldn't cancel that request. Please try again." });
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleRemoveFriend = (friend: Friend) => {
    setPendingRemoval(friend);
  };

  const confirmRemoveFriend = async () => {
    const friend = pendingRemoval;
    setPendingRemoval(null);
    if (!friend) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await friendsLib.removeFriend(friend.id);
      await loadData();
    } catch (error) {
      console.error("Error removing friend:", error);
      setFeedback({ tone: "error", message: `Couldn't remove ${friend.name}. Please try again.` });
    }
  };

  const handleAddFriend = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/add-friend" as any);
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <Pressable
      style={[styles.card, { backgroundColor: cardBackground, borderColor }]}
      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      onLongPress={() => handleRemoveFriend(item)}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.avatar, { backgroundColor: tintColor }]}>
          <ThemedText style={styles.avatarText}>
            {(item.name ?? "?").charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.cardInfo}>
          <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
          {item.username && (
            <ThemedText style={styles.username}>@{item.username}</ThemedText>
          )}
        </View>
      </View>
    </Pressable>
  );

  const renderIncomingRequest = ({ item }: { item: FriendRequestWithProfile }) => (
    <View style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
      <View style={styles.cardLeft}>
        <View style={[styles.avatar, { backgroundColor: tintColor }]}>
          <ThemedText style={styles.avatarText}>
            {(item.sender_profile?.name ?? "?").charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.cardInfo}>
          <ThemedText type="defaultSemiBold">{item.sender_profile?.name}</ThemedText>
          {item.sender_profile?.username && (
            <ThemedText style={styles.username}>@{item.sender_profile.username}</ThemedText>
          )}
        </View>
      </View>
      <View style={styles.requestActions}>
        <Pressable
          style={[styles.actionButton, styles.acceptButton, { backgroundColor: tintColor }]}
          onPress={() => handleAcceptRequest(item.id)}
          disabled={processingRequestId === item.id}
        >
          {processingRequestId === item.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <ThemedText style={styles.actionButtonText}>Accept</ThemedText>
          )}
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.rejectButton, { borderColor }]}
          onPress={() => handleRejectRequest(item.id)}
          disabled={processingRequestId === item.id}
        >
          <ThemedText style={[styles.actionButtonText, { color: tintColor }]}>
            Reject
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );

  const renderOutgoingRequest = ({ item }: { item: FriendRequestWithProfile }) => (
    <View style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
      <View style={styles.cardLeft}>
        <View style={[styles.avatar, { backgroundColor: tintColor }]}>
          <ThemedText style={styles.avatarText}>
            {(item.receiver_profile?.name ?? "?").charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.cardInfo}>
          <ThemedText type="defaultSemiBold">{item.receiver_profile?.name}</ThemedText>
          {item.receiver_profile?.username && (
            <ThemedText style={styles.username}>@{item.receiver_profile.username}</ThemedText>
          )}
          <ThemedText style={styles.pendingText}>Pending</ThemedText>
        </View>
      </View>
      <Pressable
        style={[styles.actionButton, styles.cancelButton, { borderColor }]}
        onPress={() => handleCancelRequest(item.id)}
        disabled={processingRequestId === item.id}
      >
        {processingRequestId === item.id ? (
          <ActivityIndicator size="small" color={tintColor} />
        ) : (
          <ThemedText style={[styles.actionButtonText, { color: tintColor }]}>
            Cancel
          </ThemedText>
        )}
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={tintColor} />
          <ThemedText style={styles.loadingText}>Loading friends...</ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FeedbackBanner
        feedback={feedback}
        onDismiss={() => setFeedback(null)}
        top={Math.max(insets.top, 20) + 8}
      />
      <ConfirmDialog
        visible={pendingRemoval !== null}
        title="Remove friend"
        message={
          pendingRemoval
            ? `Remove ${pendingRemoval.name} from your friends?`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        onConfirm={confirmRemoveFriend}
        onCancel={() => setPendingRemoval(null)}
      />
      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        renderItem={renderFriend}
        contentContainerStyle={[
          styles.listContent,
          {
            paddingTop: Math.max(insets.top, 20) + 60,
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={tintColor} />
        }
        ListHeaderComponent={
          <>
            {/* Header */}
            <View style={styles.header}>
              <ThemedText type="title">Friends</ThemedText>
              <ThemedText style={styles.subtitle}>
                {friends.length} {friends.length === 1 ? "friend" : "friends"}
                {incomingRequests.length > 0 && ` · ${incomingRequests.length} pending`}
              </ThemedText>
            </View>

            {/* Incoming Requests */}
            {incomingRequests.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Friend Requests ({incomingRequests.length})
                </ThemedText>
                {incomingRequests.map((request) => (
                  <View key={request.id}>{renderIncomingRequest({ item: request })}</View>
                ))}
              </View>
            )}

            {/* Outgoing Requests */}
            {outgoingRequests.length > 0 && (
              <View style={styles.section}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>
                  Sent Requests ({outgoingRequests.length})
                </ThemedText>
                {outgoingRequests.map((request) => (
                  <View key={request.id}>{renderOutgoingRequest({ item: request })}</View>
                ))}
              </View>
            )}

            {/* Friends List Header */}
            {friends.length > 0 && (
              <ThemedText type="subtitle" style={styles.sectionTitle}>
                My Friends
              </ThemedText>
            )}
          </>
        }
        ListEmptyComponent={
          incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>No friends yet</ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Add friends to compare scores and compete!
              </ThemedText>
            </View>
          ) : null
        }
      />

      {/* Floating Add Friend Button */}
      <Pressable
        style={[
          styles.floatingButton,
          {
            backgroundColor: tintColor,
            bottom: Math.max(insets.bottom, 20) + 60,
          },
        ]}
        onPress={handleAddFriend}
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
    gap: 12,
  },
  loadingText: {
    opacity: 0.6,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.6,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  cardInfo: {
    flex: 1,
  },
  username: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 2,
  },
  pendingText: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptButton: {
    // backgroundColor set dynamically
  },
  rejectButton: {
    borderWidth: 1,
  },
  cancelButton: {
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
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
