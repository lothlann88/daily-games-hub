import { useState, useEffect } from "react";
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
import * as Linking from "expo-linking";

import { Image } from "expo-image";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { supabase, isSupabaseConfigured, getSupabaseConfigError } from "@/lib/supabase";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "cardBorder");
  const inputBackground = useThemeColor({ light: "#FFFFFF", dark: "#2C2C2E" }, "background");

  // Check Supabase config on mount
  useEffect(() => {
    const error = getSupabaseConfigError();
    if (error) {
      console.error("[ForgotPassword] Supabase configuration error:", error);
      setConfigError(error);
    }
  }, []);

  const handleResetPassword = async () => {
    console.log("[ForgotPassword] Reset password button clicked");
    
    if (loading) {
      console.log("[ForgotPassword] Already loading, ignoring click");
      return;
    }

    // Check Supabase configuration
    if (configError) {
      console.error("[ForgotPassword] Cannot reset password: Supabase not configured");
      Alert.alert("Configuration Error", configError);
      return;
    }

    if (!email.trim()) {
      console.log("[ForgotPassword] Validation failed: empty email");
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      console.log("[ForgotPassword] Validation failed: invalid email format");
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    console.log("[ForgotPassword] Starting password reset process...");
    setLoading(true);

    try {
      console.log("[ForgotPassword] Calling supabase.auth.resetPasswordForEmail...");
      const redirectTo =
        Platform.OS === "web"
          ? `${window.location.origin}/auth/reset-password`
          : Linking.createURL("auth/reset-password");

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        console.error("[ForgotPassword] Reset password error:", error);
        
        // Handle specific error cases
        let errorMessage = error.message || "Unable to send reset email. Please try again.";
        
        if (error.message?.toLowerCase().includes("rate limit")) {
          errorMessage = "Too many reset requests. Please wait a few minutes and try again.";
        }
        
        Alert.alert("Error", errorMessage);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }

      console.log("[ForgotPassword] Password reset email sent successfully");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
    } catch (error: any) {
      console.error("[ForgotPassword] Caught exception:", error);
      Alert.alert("Error", error.message || "An unexpected error occurred. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
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
              paddingTop: Math.max(insets.top, 20) + 20,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <Pressable onPress={handleBackToLogin} style={styles.backButton}>
            <IconSymbol name="chevron.left" size={24} color={tintColor} />
            <ThemedText style={[styles.backText, { color: tintColor }]}>Back</ThemedText>
          </Pressable>

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
            <ThemedText type="title" style={styles.title}>
              Reset Password
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              {sent
                ? "Check your email for a password reset link"
                : "Enter your email to receive a password reset link"}
            </ThemedText>
          </View>

          {!sent ? (
            <>
              {/* Configuration Error Message */}
              {configError && (
                <View style={[styles.errorBanner, { backgroundColor: "#FEE2E2", borderColor: "#EF4444" }]}>
                  <ThemedText style={[styles.errorText, { color: "#DC2626" }]}>
                    ⚠️ {configError}
                  </ThemedText>
                </View>
              )}

              {/* Reset Form */}
              <View style={[styles.form, { backgroundColor: cardBackground, borderColor }]}>
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Email</ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: inputBackground,
                        borderColor,
                        color: useThemeColor({}, "text"),
                      },
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

                <Pressable
                  onPress={handleResetPassword}
                  disabled={loading || !!configError}
                  style={[
                    styles.resetButton,
                    { backgroundColor: tintColor },
                    (loading || configError) && styles.buttonDisabled,
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <ThemedText style={styles.resetButtonText}>Send Reset Link</ThemedText>
                  )}
                </Pressable>
              </View>
            </>
          ) : (
            <View style={[styles.successCard, { backgroundColor: cardBackground, borderColor }]}>
              <ThemedText style={styles.successIcon}>✉️</ThemedText>
              <ThemedText style={styles.successTitle}>Email Sent!</ThemedText>
              <ThemedText style={styles.successText}>
                We've sent a password reset link to{" "}
                <ThemedText style={styles.successEmail}>{email}</ThemedText>
              </ThemedText>
              <ThemedText style={styles.successNote}>
                Click the link in the email to reset your password. The link will expire in 1 hour.
              </ThemedText>

              <Pressable
                onPress={handleBackToLogin}
                style={[styles.backToLoginButton, { backgroundColor: tintColor }]}
              >
                <ThemedText style={styles.backToLoginText}>Back to Login</ThemedText>
              </Pressable>
            </View>
          )}
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
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  branding: {
    alignItems: "center",
    marginBottom: 32,
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
  backText: {
    fontSize: 16,
    marginLeft: 4,
  },
  header: {
    marginBottom: 32,
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
    paddingHorizontal: 16,
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
  resetButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  successCard: {
    borderRadius: 16,
    padding: 32,
    borderWidth: 1,
    alignItems: "center",
  },
  successIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  successText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 8,
  },
  successEmail: {
    fontWeight: "600",
  },
  successNote: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 24,
  },
  backToLoginButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 200,
  },
  backToLoginText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
