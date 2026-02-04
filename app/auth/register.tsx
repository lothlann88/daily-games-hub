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

import { Image } from "expo-image";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { supabase, getSupabaseConfigError } from "@/lib/supabase";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "cardBorder");
  const inputBackground = useThemeColor({ light: "#FFFFFF", dark: "#2C2C2E" }, "background");

  // Check Supabase configuration on mount
  useEffect(() => {
    const error = getSupabaseConfigError();
    if (error) {
      console.error("[Register] Supabase configuration error:", error);
      setConfigError(error);
    }
  }, []);

  const validateForm = () => {
    if (!email.trim()) {
      Alert.alert("Error", "Please enter your email");
      return false;
    }

    if (!email.includes("@")) {
      Alert.alert("Error", "Please enter a valid email address");
      return false;
    }

    if (password.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    // Check Supabase configuration before attempting registration
    if (configError) {
      console.error("[Register] Cannot register: Supabase not configured");
      Alert.alert("Configuration Error", configError);
      return;
    }

    console.log("[Register] Starting registration for:", email.trim());
    setLoading(true);
    
    try {
      console.log("[Register] Calling supabase.auth.signUp...");
      
      // Add timeout to prevent infinite hanging
      const signUpPromise = supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Registration timeout - please try again")), 30000)
      );
      
      const { data, error } = await Promise.race([signUpPromise, timeoutPromise]) as any;
      
      console.log("[Register] Response received:", { 
        hasData: !!data, 
        hasUser: !!data?.user,
        userId: data?.user?.id,
        hasError: !!error,
        errorMessage: error?.message 
      });

      if (error) {
        console.error("[Register] Registration error:", error);
        Alert.alert("Registration Failed", error.message);
        return;
      }

      if (!data?.user) {
        console.error("[Register] No user data returned");
        Alert.alert("Error", "Registration failed - no user data received");
        return;
      }

      console.log("[Register] Registration successful:", data.user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Check if email confirmation is required
      const needsConfirmation = data.user.identities?.length === 0;
      
      Alert.alert(
        "Success!",
        needsConfirmation 
          ? "Your account has been created. Please check your email to verify your account before signing in."
          : "Your account has been created successfully! You can now sign in.",
        [
          {
            text: "OK",
            onPress: () => router.replace("/auth/login" as any),
          },
        ]
      );
    } catch (error: any) {
      console.error("[Register] Caught error:", error);
      Alert.alert(
        "Error", 
        error.message || "An unexpected error occurred. Please check your internet connection and try again."
      );
    } finally {
      console.log("[Register] Cleaning up, setting loading to false");
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
              paddingBottom: Math.max(insets.bottom, 20) + 40, // Add extra bottom padding to prevent cutoff
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
              Create Account
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Sign up to start tracking your daily games
            </ThemedText>
          </View>

          {/* Configuration Error Banner */}
          {configError && (
            <View style={[styles.errorBanner, { backgroundColor: "#FEE2E2", borderColor: "#EF4444" }]}>
              <ThemedText style={[styles.errorText, { color: "#DC2626" }]}>
                ⚠️ {configError}
              </ThemedText>
            </View>
          )}

          {/* Registration Form */}
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
                placeholder="At least 8 characters"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Confirm Password</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: inputBackground, borderColor, color: useThemeColor({}, "text") },
                ]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter password"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <Pressable
              onPress={handleRegister}
              disabled={loading}
              style={[
                styles.registerButton,
                { backgroundColor: tintColor },
                loading && styles.buttonDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.registerButtonText}>Create Account</ThemedText>
              )}
            </Pressable>
          </View>

          {/* Terms */}
          <ThemedText style={styles.terms}>
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </ThemedText>
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
  oldBackButton: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
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
    marginBottom: 16,
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
  registerButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  registerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  terms: {
    fontSize: 12,
    lineHeight: 18,
    opacity: 0.6,
    textAlign: "center",
    paddingHorizontal: 16,
  },
});
