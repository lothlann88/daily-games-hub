// Friends System Types

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  created_at: string;
}

export interface FriendRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  updated_at: string;
}

export interface Friend {
  id: string;
  name: string;
  username?: string;
  avatar_url?: string;
  is_private: boolean;
  friendship_created_at: string;
}

export interface FriendRequestWithProfile extends FriendRequest {
  sender_profile?: {
    id: string;
    name: string;
    username?: string;
    avatar_url?: string;
  };
  receiver_profile?: {
    id: string;
    name: string;
    username?: string;
    avatar_url?: string;
  };
}

export interface SearchResult {
  id: string;
  name: string;
  username?: string;
  avatar_url?: string;
  is_private: boolean;
  is_friend: boolean;
  has_pending_request: boolean;
  request_direction?: "sent" | "received";
}

export interface FriendScore {
  friend_id: string;
  friend_name: string;
  friend_avatar?: string;
  score: number;
  played_at: string;
  rank?: number;
}

export interface FriendLeaderboardEntry {
  user_id: string;
  name: string;
  avatar_url?: string;
  best_score: number;
  total_plays: number;
  current_streak: number;
  rank: number;
  is_current_user: boolean;
}

export interface StatsComparison {
  user: {
    id: string;
    name: string;
    total_games: number;
    total_scores: number;
    average_score: number;
    best_streak: number;
  };
  friend: {
    id: string;
    name: string;
    total_games: number;
    total_scores: number;
    average_score: number;
    best_streak: number;
  };
  shared_games: Array<{
    game_id: string;
    game_name: string;
    user_best: number;
    friend_best: number;
    winner: "user" | "friend" | "tie";
  }>;
}
