import { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useUserProfile } from "@/hooks/use-storage";
import { setOnboardingComplete } from "@/lib/storage";
import { validateUsername } from "@/lib/username";
import { UserProfile } from "@/types";

export default function OnboardingScreen() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  // Rendered inline: RN-web's Alert.alert is a no-op, so alerts never show on web
  const [formError, setFormError] = useState<string | null>(null);
  const { saveProfile } = useUserProfile();
  const router = useRouter();
  
  const primary = useThemeColor({}, "tint");
  const borderColor = "#E5E5EA";
  const inputBg = useThemeColor({ light: "#F2F2F7", dark: "#1C1C1E" }, "card");

  const handleContinue = async () => {
    if (!name.trim()) {
      setFormError("Please enter your name to continue.");
      return;
    }
    setFormError(null);

    // Validate username if provided
    if (username.trim()) {
      const problem = validateUsername(username);
      if (problem) {
        setUsernameError(problem);
        return;
      }
      const usernameValue = username.trim().toLowerCase();

      // Check availability. A failure here must block rather than fall
      // through: the unique index would reject the save anyway, and the
      // person would see a generic "could not create your profile" instead.
      try {
        const { currentUserId } = await import("@/lib/pocketbase");
        const { lookupUsername } = await import("@/lib/friends");
        const taken = await lookupUsername(usernameValue);
        if (taken && taken.id !== currentUserId()) {
          setUsernameError("This username is already taken");
          return;
        }
      } catch (error: any) {
        console.error("Error checking username:", error);
        setUsernameError("Could not check that username. Please try again.");
        return;
      }
    }

    setLoading(true);
    try {
      const { currentUserId } = await import("@/lib/pocketbase");
      const { syncUserProfile } = await import("@/lib/sync");
      const profile: UserProfile = {
        id: currentUserId() ?? `user-${Date.now()}`,
        name: name.trim(),
        username: username.trim() ? username.trim().toLowerCase() : undefined,
        createdAt: Date.now(),
      };

      await saveProfile(profile);
      await syncUserProfile(profile);
      await setOnboardingComplete();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate to main app
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Error saving profile:", error);
      setFormError("Could not create your profile. Please try again.");
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.content}
      >
        <View style={styles.header}>
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.logo}
            contentFit="contain"
          />
          <ThemedText type="title" style={styles.title}>
            Welcome to{"\n"}Daily Games Hub
          </ThemedText>
          <ThemedText style={styles.byline}>
            by Serhan Handani
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Your personal hub for daily puzzle games, streak tracking, and friendly competition
          </ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.formGroup}>
            <ThemedText type="subtitle" style={styles.label}>
              What&apos;s your name?
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: inputBg, borderColor, color: primary }]}
              placeholder="Enter your name"
              placeholderTextColor="#999"
              value={name}
              onChangeText={setName}
              autoFocus
              autoCapitalize="words"
              returnKeyType="next"
            />
          </View>

          <View style={styles.formGroup}>
            <ThemedText type="subtitle" style={styles.label}>
              Choose a username (optional)
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                { backgroundColor: inputBg, borderColor, color: primary },
                usernameError && styles.inputError,
              ]}
              placeholder="username (3-20 characters)"
              placeholderTextColor="#999"
              value={username}
              onChangeText={(text) => {
                setUsername(text);
                setUsernameError("");
              }}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleContinue}
            />
            {usernameError ? (
              <ThemedText style={styles.errorText}>{usernameError}</ThemedText>
            ) : (
              <ThemedText style={styles.hintText}>
                Your username helps friends find you easily
              </ThemedText>
            )}
          </View>
        </View>

        {formError ? (
          <ThemedText style={styles.formError}>{formError}</ThemedText>
        ) : null}

        <Pressable
          onPress={handleContinue}
          disabled={loading || !name.trim()}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: primary },
            (loading || !name.trim()) && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}
        >
          <ThemedText style={styles.buttonText}>
            {loading ? "Setting up..." : "Get Started"}
          </ThemedText>
        </Pressable>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  },
  header: {
    marginBottom: 48,
    alignItems: "center",
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 24,
  },
  title: {
    marginBottom: 12,
    textAlign: "center",
  },
  byline: {
    fontSize: 16,
    opacity: 0.6,
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 16,
  },
  subtitle: {
    textAlign: "center",
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.7,
  },
  form: {
    marginBottom: 32,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    marginBottom: 12,
  },
  input: {
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 18,
  },
  inputError: {
    borderColor: "#FF3B30",
    borderWidth: 2,
  },
  hintText: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.6,
    marginTop: 8,
  },
  formError: {
    color: "#DC2626",
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#FF3B30",
    marginTop: 8,
  },
  button: {
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
