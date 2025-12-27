import { useState } from "react";
import { View, StyleSheet, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useUserProfile } from "@/hooks/use-storage";
import { setOnboardingComplete } from "@/lib/storage";
import { UserProfile } from "@/types";

export default function OnboardingScreen() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { saveProfile } = useUserProfile();
  const router = useRouter();
  
  const primary = useThemeColor({}, "tint");
  const borderColor = "#E5E5EA";
  const inputBg = useThemeColor({ light: "#F2F2F7", dark: "#1C1C1E" }, "card");

  const handleContinue = async () => {
    if (!name.trim()) {
      Alert.alert("Name Required", "Please enter your name to continue");
      return;
    }

    setLoading(true);
    try {
      const profile: UserProfile = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        createdAt: Date.now(),
      };

      await saveProfile(profile);
      await setOnboardingComplete();
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate to main app
      router.replace("/(tabs)");
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Failed to create profile. Please try again.");
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
          <ThemedText type="title" style={styles.title}>
            Welcome to{"\n"}Daily Games Hub
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Your personal hub for daily puzzle games, streak tracking, and friendly competition
          </ThemedText>
        </View>

        <View style={styles.form}>
          <ThemedText type="subtitle" style={styles.label}>
            What's your name?
          </ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: inputBg, borderColor, color: primary }]}
            placeholder="Enter your name"
            placeholderTextColor="#999"
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
            returnKeyType="done"
            onSubmitEditing={handleContinue}
          />
        </View>

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
  },
  title: {
    marginBottom: 16,
    textAlign: "center",
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
