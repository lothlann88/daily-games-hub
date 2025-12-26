import { GameTag } from "@/types";

export const AVAILABLE_TAGS: GameTag[] = [
  "Quick",
  "Challenging",
  "Relaxing",
  "Logic",
  "Visual",
  "Audio",
  "Math",
  "Geography",
  "Music",
  "Movies",
];

export const TAG_COLORS: Record<GameTag, string> = {
  Quick: "#10B981", // Green
  Challenging: "#EF4444", // Red
  Relaxing: "#3B82F6", // Blue
  Logic: "#8B5CF6", // Purple
  Visual: "#F59E0B", // Orange
  Audio: "#EC4899", // Pink
  Math: "#6366F1", // Indigo
  Geography: "#14B8A6", // Teal
  Music: "#A855F7", // Purple
  Movies: "#F97316", // Orange
};

export const TAG_DESCRIPTIONS: Record<GameTag, string> = {
  Quick: "Can be completed in under 5 minutes",
  Challenging: "Requires significant effort or skill",
  Relaxing: "Low-pressure, enjoyable experience",
  Logic: "Requires deductive reasoning",
  Visual: "Primarily visual-based gameplay",
  Audio: "Involves sound or music",
  Math: "Involves numbers or calculations",
  Geography: "Geography or location-based",
  Music: "Music identification or trivia",
  Movies: "Film or movie-related content",
};
