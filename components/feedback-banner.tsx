import { useEffect, useRef } from "react";
import { StyleSheet, View, Pressable } from "react-native";

import { ThemedText } from "@/components/themed-text";

export type FeedbackTone = "success" | "error";

export interface FeedbackState {
  tone: FeedbackTone;
  message: string;
}

// Inline, self-dismissing status banner. Replaces Alert.alert for success and
// error toasts — Alert is a no-op on React Native Web, which is the only
// deployment target, so those messages never appeared.
const TONE_COLOR: Record<FeedbackTone, string> = {
  success: "#1E8E4E",
  error: "#C2382C",
};

interface FeedbackBannerProps {
  feedback: FeedbackState | null;
  onDismiss: () => void;
  /** Distance from the top of the containing view (usually safe-area inset). */
  top?: number;
  /** Auto-dismiss delay in ms. */
  duration?: number;
}

export function FeedbackBanner({
  feedback,
  onDismiss,
  top = 20,
  duration = 3500,
}: FeedbackBannerProps) {
  // Kept in a ref so a new inline onDismiss each render doesn't restart the
  // timer; the effect re-runs only when the feedback object itself changes.
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => onDismissRef.current(), duration);
    return () => clearTimeout(timer);
  }, [feedback, duration]);

  if (!feedback) return null;

  return (
    <View style={[styles.wrap, { top }]} pointerEvents="box-none">
      <Pressable
        onPress={onDismiss}
        accessibilityRole="alert"
        style={[styles.banner, { backgroundColor: TONE_COLOR[feedback.tone] }]}
      >
        <ThemedText style={styles.text}>{feedback.message}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 1000,
    alignItems: "center",
  },
  banner: {
    width: "100%",
    maxWidth: 520,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  text: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
