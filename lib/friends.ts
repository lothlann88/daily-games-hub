import { pb, currentUserId } from "./pocketbase";
import type {
  Friend,
  FriendRequestWithProfile,
  SearchResult,
  FriendScore,
  FriendLeaderboardEntry,
} from "@/types/friends";

// Screens consume the shapes in types/friends.ts (snake_case, *_profile
// embeds), so every function here maps PocketBase records into those shapes —
// the UI is unchanged from the Supabase era. Server invariants (both
// friendship rows on accept, mirror-row delete) live in server/pb_hooks.

function profileFromRecord(record: any) {
  return {
    id: record.id,
    name: record.name,
    username: record.username || undefined,
    avatar_url: record.avatar_url || undefined,
  };
}

function requestFromRecord(record: any): FriendRequestWithProfile {
  const sender = record.expand?.sender;
  const receiver = record.expand?.receiver;
  return {
    id: record.id,
    sender_id: record.sender,
    receiver_id: record.receiver,
    status: record.status,
    created_at: record.created,
    updated_at: record.updated,
    ...(sender ? { sender_profile: profileFromRecord(sender) } : {}),
    ...(receiver ? { receiver_profile: profileFromRecord(receiver) } : {}),
  };
}

// ============================================================================
// FRIEND REQUEST FUNCTIONS
// ============================================================================

/**
 * Send a friend request to another user
 */
export async function sendFriendRequest(receiverId: string): Promise<void> {
  const userId = currentUserId();
  if (!userId) throw new Error("Not authenticated");

  // Cannot send request to self
  if (receiverId === userId) {
    throw new Error("Cannot send friend request to yourself");
  }

  // Check if already friends
  const areFriends = await checkAreFriends(receiverId);
  if (areFriends) {
    throw new Error("Already friends with this user");
  }

  // Check if a request already exists in either direction
  const existing = await pb.collection("friend_requests").getList(1, 1, {
    filter: pb.filter(
      "(sender = {:me} && receiver = {:them}) || (sender = {:them} && receiver = {:me})",
      { me: userId, them: receiverId },
    ),
  });
  if (existing.totalItems > 0) {
    throw new Error("Friend request already exists");
  }

  await pb.collection("friend_requests").create({
    sender: userId,
    receiver: receiverId,
    status: "pending",
  });
}

/**
 * Accept a friend request. The server hook creates both friendship rows.
 */
export async function acceptFriendRequest(requestId: string): Promise<void> {
  await pb.collection("friend_requests").update(requestId, { status: "accepted" });
}

/**
 * Reject a friend request
 */
export async function rejectFriendRequest(requestId: string): Promise<void> {
  await pb.collection("friend_requests").update(requestId, { status: "rejected" });
}

/**
 * Cancel a sent friend request
 */
export async function cancelFriendRequest(requestId: string): Promise<void> {
  await pb.collection("friend_requests").delete(requestId);
}

/**
 * Get incoming friend requests (requests sent to current user)
 */
export async function getIncomingFriendRequests(): Promise<FriendRequestWithProfile[]> {
  const userId = currentUserId();
  if (!userId) return [];

  const records = await pb.collection("friend_requests").getFullList({
    filter: pb.filter("receiver = {:me} && status = 'pending'", { me: userId }),
    sort: "-created",
    expand: "sender",
  });

  return records.map(requestFromRecord);
}

/**
 * Get outgoing friend requests (requests sent by current user)
 */
export async function getOutgoingFriendRequests(): Promise<FriendRequestWithProfile[]> {
  const userId = currentUserId();
  if (!userId) return [];

  const records = await pb.collection("friend_requests").getFullList({
    filter: pb.filter("sender = {:me} && status = 'pending'", { me: userId }),
    sort: "-created",
    expand: "receiver",
  });

  return records.map(requestFromRecord);
}

// ============================================================================
// FRIEND MANAGEMENT FUNCTIONS
// ============================================================================

/**
 * Get list of friends
 */
export async function getFriends(): Promise<Friend[]> {
  const userId = currentUserId();
  if (!userId) return [];

  const records = await pb.collection("friendships").getFullList({
    filter: pb.filter("user = {:me}", { me: userId }),
    sort: "-created",
    expand: "friend",
  });

  return records
    .filter((friendship: any) => friendship.expand?.friend)
    .map((friendship: any) => {
      const friendProfile = friendship.expand.friend;
      return {
        id: friendProfile.id,
        name: friendProfile.name,
        username: friendProfile.username || undefined,
        avatar_url: friendProfile.avatar_url || undefined,
        is_private: friendProfile.is_private ?? false,
        friendship_created_at: friendship.created,
      };
    });
}

/**
 * Remove a friend. Deleting one friendship row is enough — the server hook
 * removes the mirror row and the resolved request.
 */
export async function removeFriend(friendId: string): Promise<void> {
  const userId = currentUserId();
  if (!userId) throw new Error("Not authenticated");

  const friendship = await pb
    .collection("friendships")
    .getFirstListItem(pb.filter("user = {:me} && friend = {:them}", { me: userId, them: friendId }));

  await pb.collection("friendships").delete(friendship.id);
}

/**
 * Search for users by name or username
 */
export async function searchUsers(query: string): Promise<SearchResult[]> {
  const userId = currentUserId();
  if (!userId) return [];

  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  // pb.filter() escapes the parameters, so no manual sanitising is needed
  const result = await pb.collection("users").getList(1, 20, {
    filter: pb.filter("id != {:me} && (name ~ {:q} || username ~ {:q})", {
      me: userId,
      q: trimmed,
    }),
  });

  // Check friendship and request status for each result
  return Promise.all(
    result.items.map(async (record: any) => {
      const isFriend = await checkAreFriends(record.id);
      const requestStatus = await checkPendingRequest(record.id);

      return {
        ...profileFromRecord(record),
        is_private: record.is_private ?? false,
        is_friend: isFriend,
        has_pending_request: requestStatus.has_request,
        request_direction: requestStatus.direction,
      };
    }),
  );
}

/**
 * Check if users are friends
 */
export async function checkAreFriends(friendId: string): Promise<boolean> {
  const userId = currentUserId();
  if (!userId) return false;

  const result = await pb.collection("friendships").getList(1, 1, {
    filter: pb.filter("user = {:me} && friend = {:them}", { me: userId, them: friendId }),
  });

  return result.totalItems > 0;
}

/**
 * Check if friend request exists
 */
export async function checkPendingRequest(
  userId: string
): Promise<{ has_request: boolean; direction?: "sent" | "received" }> {
  const me = currentUserId();
  if (!me) return { has_request: false };

  const result = await pb.collection("friend_requests").getList(1, 1, {
    filter: pb.filter(
      "((sender = {:me} && receiver = {:them}) || (sender = {:them} && receiver = {:me})) && status = 'pending'",
      { me, them: userId },
    ),
  });

  const request: any = result.items[0];
  if (!request) return { has_request: false };
  return { has_request: true, direction: request.sender === me ? "sent" : "received" };
}

// ============================================================================
// SCORE COMPARISON FUNCTIONS
// ============================================================================

/**
 * Get friend scores for a specific game. Friends' scores are readable thanks
 * to the friend-visibility rule on the scores collection.
 */
export async function getFriendScoresForGame(gameId: string): Promise<FriendScore[]> {
  const userId = currentUserId();
  if (!userId) return [];

  // Get all friends
  const friends = await getFriends();
  if (friends.length === 0) return [];

  // Friend-readable scores for this game (excluding our own). score is a json
  // field, so best-per-friend is computed here rather than by server sort.
  const scores = await pb.collection("scores").getFullList({
    filter: pb.filter("game_id = {:game} && owner != {:me}", { game: gameId, me: userId }),
  });

  const bestByFriend = new Map<string, any>();
  for (const score of scores as any[]) {
    const current = bestByFriend.get(score.owner);
    const scoreValue = (s: any) => (s.score != null ? s.score : -Infinity);
    if (!current || scoreValue(score) > scoreValue(current)) {
      bestByFriend.set(score.owner, score);
    }
  }

  const friendScores: FriendScore[] = [];
  for (const [ownerId, score] of bestByFriend) {
    const friend = friends.find((f) => f.id === ownerId);
    if (friend) {
      friendScores.push({
        friend_id: friend.id,
        friend_name: friend.name,
        friend_avatar: friend.avatar_url,
        score: score.score,
        date_played: score.date_played,
      });
    }
  }

  // Best score first, then add rank
  friendScores.sort((a, b) => (b.score ?? -Infinity) - (a.score ?? -Infinity));
  return friendScores.map((fs, index) => ({
    ...fs,
    rank: index + 1,
  }));
}

/**
 * Get friend leaderboard for a game (including current user)
 */
export async function getFriendLeaderboard(gameId: string): Promise<FriendLeaderboardEntry[]> {
  const userId = currentUserId();
  if (!userId) return [];

  // Get all friends
  const friends = await getFriends();

  // All scores for this game that the rules let us read: ours + friends'
  const scores = await pb.collection("scores").getFullList({
    filter: pb.filter("game_id = {:game}", { game: gameId }),
  });

  // Calculate stats for each user
  const userStats = new Map<
    string,
    { best_score: number; total_plays: number; current_streak: number }
  >();

  const noScoreSentinel = -Infinity;
  for (const score of scores as any[]) {
    const numScore = score.score != null ? score.score : noScoreSentinel;
    const existing = userStats.get(score.owner);
    if (!existing) {
      userStats.set(score.owner, {
        best_score: numScore,
        total_plays: 1,
        current_streak: 0, // TODO: Calculate streak
      });
    } else {
      existing.total_plays++;
      if (numScore !== noScoreSentinel && numScore > existing.best_score) {
        existing.best_score = numScore;
      }
    }
  }

  // Build leaderboard entries
  const entries: FriendLeaderboardEntry[] = [];

  for (const [entryUserId, stats] of userStats.entries()) {
    const isCurrentUser = entryUserId === userId;
    let name = "You";
    let avatar_url: string | undefined;

    if (!isCurrentUser) {
      const friend = friends.find((f) => f.id === entryUserId);
      if (!friend) continue; // score from a since-removed friend
      name = friend.name;
      avatar_url = friend.avatar_url;
    } else {
      avatar_url = pb.authStore.record?.avatar_url || undefined;
    }

    entries.push({
      user_id: entryUserId,
      name,
      avatar_url,
      best_score: stats.best_score,
      total_plays: stats.total_plays,
      current_streak: stats.current_streak,
      rank: 0, // Will be set below
      is_current_user: isCurrentUser,
    });
  }

  // Sort by best score (entries with no score go last)
  const scoreValue = (entry: FriendLeaderboardEntry) =>
    entry.best_score === -Infinity || !Number.isFinite(entry.best_score) ? -Infinity : entry.best_score;
  entries.sort((a, b) => scoreValue(b) - scoreValue(a));
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return entries;
}
