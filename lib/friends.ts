import { pb, currentUserId } from "./pocketbase";
import { beatsScore, compareScoresBestFirst } from "@/lib/score-order";
import { normaliseUsernameQuery } from "@/lib/username";
import type { ScoreOrder } from "@/types";
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
        is_private: friendProfile.is_private ?? true,
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

/** The five fields GET /api/dgh/users/lookup returns. */
export interface LookupProfile {
  id: string;
  name: string;
  username: string;
  avatar_url: string;
  is_private: boolean;
}

/**
 * Look someone up by their exact username.
 *
 * Nobody can browse the account list any more, so this endpoint is the only
 * way to find a person. Returns null when there is no such username.
 */
export async function lookupUsername(username: string): Promise<LookupProfile | null> {
  const cleaned = normaliseUsernameQuery(username);
  if (!cleaned) return null;

  try {
    return (await pb.send("/api/dgh/users/lookup", {
      method: "GET",
      username: cleaned,
    })) as LookupProfile;
  } catch (error: any) {
    // 404 is the ordinary "no such username" answer, not a failure.
    if (error?.status === 404 || error?.status === 400) return null;
    throw error;
  }
}

/**
 * Find someone to add as a friend. Exact username only — searching by name
 * would mean listing accounts, which is no longer permitted.
 *
 * Returns at most one result, in an array so callers keep their list shape.
 */
export async function searchUsers(query: string): Promise<SearchResult[]> {
  const userId = currentUserId();
  if (!userId) return [];

  const profile = await lookupUsername(query);
  if (!profile || profile.id === userId) return [];

  const [isFriend, requestStatus] = await Promise.all([
    checkAreFriends(profile.id),
    checkPendingRequest(profile.id),
  ]);

  return [
    {
      id: profile.id,
      name: profile.name,
      username: profile.username || undefined,
      avatar_url: profile.avatar_url || undefined,
      is_private: profile.is_private ?? true,
      is_friend: isFriend,
      has_pending_request: requestStatus.has_request,
      request_direction: requestStatus.direction,
    },
  ];
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
export async function getFriendScoresForGame(
  gameId: string,
  scoreOrder?: ScoreOrder
): Promise<FriendScore[]> {
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
    if (score.deleted) continue; // soft-deleted tombstone
    const current = bestByFriend.get(score.owner);
    if (!current || beatsScore(score.score, current.score, scoreOrder)) {
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
  friendScores.sort((a, b) => compareScoresBestFirst(a.score, b.score, scoreOrder));
  return friendScores.map((fs, index) => ({
    ...fs,
    rank: index + 1,
  }));
}

/**
 * Get friend leaderboard for a game (including current user)
 */
export async function getFriendLeaderboard(
  gameId: string,
  scoreOrder?: ScoreOrder
): Promise<FriendLeaderboardEntry[]> {
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
    if (score.deleted) continue; // soft-deleted tombstone
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
      const incumbent =
        existing.best_score === noScoreSentinel ? null : existing.best_score;
      if (numScore !== noScoreSentinel && beatsScore(numScore, incumbent, scoreOrder)) {
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

  // Sort by best score per the game's direction (entries with no score last)
  entries.sort((a, b) => compareScoresBestFirst(a.best_score, b.best_score, scoreOrder));
  entries.forEach((entry, index) => {
    entry.rank = index + 1;
  });

  return entries;
}
