import { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
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
import { supabase, isSupabaseConfigured, getSupabaseConfigError } from "@/lib/supabase";

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
  const [configError, setConfigError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [timeoutSeconds, setTimeoutSeconds] = useState(15);
  const loginDebouncer = useRef(createDebouncer(1000));
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "cardBorder");
  const inputBackground = useThemeColor({ light: "#FFFFFF", dark: "#2C2C2E" }, "background");

  // Reset loading state and check Supabase config on mount
  useEffect(() => {
    console.log("[Login] Screen mounted, resetting loading state");
    setLoading(false);
    
    // Check if Supabase is configured
    const error = getSupabaseConfigError();
    if (error) {
      console.error("[Login] Supabase configuration error:", error);
      setConfigError(error);
    }
  }, []);

  const handleLogin = async () => {
    console.log("[Login] Login button clicked");
    console.log("[Login] Current loading state:", loading);
    console.log("[Login] Email:", email.trim());

    // Debounce check - prevent rapid clicks
    const canProceed = loginDebouncer.current(() => {});
    if (!canProceed) {
      console.log("[Login] Debounced - too many rapid clicks");
      return;
    }

    if (loading) {
      console.log("[Login] Already loading, ignoring click");
      return;
    }

    // Check Supabase configuration before attempting login
    if (configError) {
      console.error("[Login] Cannot login: Supabase not configured");
      Alert.alert("Configuration Error", configError);
      return;
    }

    if (!email.trim() || !password.trim()) {
      console.log("[Login] Validation failed: empty email or password");
      Alert.alert("Error", "Please enter both email and password");
      return;
    }

    console.log("[Login] Starting login process...");
    setLoading(true);
    setTimeoutSeconds(15);

    // Visual countdown timer
    const countdownInterval = setInterval(() => {
      setTimeoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Reduced timeout: 15 seconds instead of 30
    const timeoutId = setTimeout(() => {
      console.error("[Login] Login timeout after 15 seconds");
      setLoading(false);
      clearInterval(countdownInterval);

      // Offer retry with attempt counter
      Alert.alert(
        "Connection Timeout",
        `Login took too long. Would you like to retry? (Attempt ${retryCount + 1}/3)`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Retry",
            onPress: () => {
              if (retryCount < 2) {
                setRetryCount(retryCount + 1);
                setTimeout(() => handleLogin(), 1000);
              } else {
                Alert.alert(
                  "Maximum Retries Reached",
                  "Please check your internet connection and try again later."
                );
              }
            }
          }
        ]
      );
    }, 15000);
    
    try {
      console.log("[Login] Calling supabase.auth.signInWithPassword...");
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      // Clear countdown on response
      clearInterval(countdownInterval);

      console.log("[Login] Response received:", {
        hasData: !!data,
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        hasError: !!error,
        errorMessage: error?.message,
      });

      if (error) {
        console.error("[Login] Login error:", error);

        // Handle specific error cases with user-friendly messages
        let errorMessage = error.message || "Unable to sign in. Please check your credentials.";

        if (error.message?.toLowerCase().includes("invalid login credentials")) {
          errorMessage = "Invalid email or password. Please check your credentials and try again.";
        } else if (error.message?.toLowerCase().includes("email not confirmed")) {
          errorMessage = "Please verify your email address. Check your inbox for a confirmation link.";
        } else if (error.message?.toLowerCase().includes("user not found")) {
          errorMessage = "No account found with this email. Please sign up first.";
        } else if (error.message?.toLowerCase().includes("too many requests")) {
          errorMessage = "Too many login attempts. Please wait 5 minutes and try again.";
        }

        Alert.alert("Login Failed", errorMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      if (!data?.user) {
        console.error("[Login] No user in response despite no error");
        Alert.alert("Error", "Login succeeded but no user data received. Please try again.");
        return;
      }

      console.log("[Login] Login successful:", data.user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reset retry count on success
      setRetryCount(0);

      // Explicitly navigate to home screen after successful login
      // Don't rely solely on auth state listener which may not fire
      console.log("[Login] Navigating to home screen...");
      router.replace("/(tabs)");
    } catch (error: any) {
      clearInterval(countdownInterval);
      console.error("[Login] Caught exception:", error);
      console.error("[Login] Error details:", {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      });
      Alert.alert("Error", error.message || "An unexpected error occurred during login.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      clearTimeout(timeoutId);
      clearInterval(countdownInterval);
      console.log("[Login] Setting loading to false");
      setLoading(false);
    }
  };

  const handleSignUp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/auth/register");
  };

  const handleForgotPassword = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/auth/forgot-password");
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

          {/* Configuration Error Message */}
          {configError && (
            <View style={[styles.errorBanner, { backgroundColor: "#FEE2E2", borderColor: "#EF4444" }]}>
              <ThemedText style={[styles.errorText, { color: "#DC2626" }]}>
                ⚠️ {configError}
              </ThemedText>
            </View>
          )}

          {/* Login Form */}
          <View style={[styles.form, { backgroundColor: cardBackground, borderColor }]}>
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, borderColor, color: useThemeColor({}, "text") },
                ]}
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
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, borderColor, color: useThemeColor({}, "text") },
                ]}
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

            <Pressable onPress={handleForgotPassword} disabled={loading}>
              <ThemedText style={[styles.forgotPassword, { color: tintColor }]}>
                Forgot password?
              </ThemedText>
            </Pressable>

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
                  <ThemedText style={styles.loadingText}>
                    Signing in... ({timeoutSeconds}s)
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.loginButtonText}>Sign In</ThemedText>
              )}
            </Pressable>
          </View>

          {/* Sign Up Link */}
          <View style={styles.signupContainer}>
            <ThemedText style={styles.signupText}>Don't have an account? </ThemedText>
            <Pressable onPress={handleSignUp} disabled={loading}>
              <ThemedText style={[styles.signupLink, { color: tintColor }]}>
                Sign Up
              </ThemedText>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
            <ThemedText style={styles.dividerText}>or</ThemedText>
            <View style={[styles.dividerLine, { backgroundColor: borderColor }]} />
          </View>

          {/* Social Login Buttons (Placeholder) */}
          <View style={styles.socialButtons}>
            <ThemedText style={styles.socialNote}>
              Social login (Google, Apple) coming soon
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
  errorBanner: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    fontWeight: "500",
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
  forgotPassword: {
    fontSize: 14,
    textAlign: "right",
    marginBottom: 24,
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
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  signupText: {
    fontSize: 15,
  },
  signupLink: {
    fontSize: 15,
    fontWeight: "600",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    opacity: 0.5,
  },
  socialButtons: {
    alignItems: "center",
  },
  socialNote: {
    fontSize: 14,
    opacity: 0.5,
    fontStyle: "italic",
  },
});
