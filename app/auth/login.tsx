import { useState, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { Image } from "expo-image";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { pb } from "@/lib/pocketbase";

// Debounce utility to prevent rapid clicks
function createDebouncer(delayMs: number) {
  let isBlocked = false;

  return function debounce(fn: () => void): boolean {
    if (isBlocked) return false;

    isBlocked = true;
    fn();

    setTimeout(() => {
      isBlocked = false;
    }, delayMs);

    return true;
  };
}

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // Rendered inline: RN-web's Alert.alert is a no-op, so alerts never show on web
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loginDebouncer = useRef(createDebouncer(1000));
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "cardBorder");
  const inputBackground = useThemeColor({ light: "#FFFFFF", dark: "#2C2C2E" }, "background");
  const textColor = useThemeColor({}, "text");

  const handleLogin = async () => {
    // Debounce check - prevent rapid clicks
    const canProceed = loginDebouncer.current(() => {});
    if (!canProceed || loading) return;

    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setErrorMessage(null);
    setLoading(true);
    try {
      console.log("[Login] Signing in...");
      await pb.collection("users").authWithPassword(email.trim(), password);

      console.log("[Login] Login successful:", pb.authStore.record?.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Explicitly navigate to home screen after successful login
      // Don't rely solely on auth state listener which may not fire
      router.replace("/(tabs)");
    } catch (error: any) {
      console.error("[Login] Login error:", error);

      let message = "Unable to sign in. Please try again.";
      if (error?.status === 400) {
        message = "Invalid email or password. Sign in with your email address, not your username.";
      } else if (error?.status === 429) {
        message = "Too many login attempts. Please wait a moment and try again.";
      } else if (error?.status === 0) {
        message = "Could not reach the server. Please check your connection and try again.";
      }

      setErrorMessage(message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 20) + 40,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Logo and Branding */}
          <View style={styles.branding}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logo}
              contentFit="contain"
            />
            <ThemedText type="title" style={styles.appTitle}>
              Daily Games Hub
            </ThemedText>
            <ThemedText style={styles.byline}>
              by Serhan Handani
            </ThemedText>
          </View>

          {/* Header */}
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              Welcome Back
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Sign in to sync your games across devices
            </ThemedText>
          </View>

          {/* Login Form */}
          <View style={[styles.form, { backgroundColor: cardBackground, borderColor }]}>
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBackground, borderColor, color: textColor }]}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBackground, borderColor, color: textColor }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            {errorMessage && (
              <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
            )}

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={[
                styles.loginButton,
                { backgroundColor: tintColor },
                loading && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" />
                  <ThemedText style={styles.loadingText}>Signing in...</ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.loginButtonText}>Sign In</ThemedText>
              )}
            </Pressable>
          </View>

          {/* Accounts are created by the household admin */}
          <View style={styles.signupContainer}>
            <ThemedText style={styles.signupText}>
              Need an account or a password reset? Ask Serhan.
            </ThemedText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  branding: {
    alignItems: "center",
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  appTitle: {
    marginBottom: 4,
    textAlign: "center",
    fontSize: 28,
    fontWeight: "bold",
  },
  byline: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
    fontStyle: "italic",
  },
  header: {
    marginBottom: 24,
    alignItems: "center",
  },
  title: {
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.7,
    textAlign: "center",
  },
  form: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  loginButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  signupContainer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  signupText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
  },
});
