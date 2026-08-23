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
import { normaliseInviteCode, validateSignupInput } from "@/lib/invite";
import { pb } from "@/lib/pocketbase";

// Matches the login screen's guard against rapid double-taps.
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

export default function SignUpScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  // Rendered inline: RN-web's Alert.alert is a no-op, so alerts never show on web
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const submitDebouncer = useRef(createDebouncer(1000));
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "cardBorder");
  const inputBackground = useThemeColor({ light: "#FFFFFF", dark: "#2C2C2E" }, "background");
  const textColor = useThemeColor({}, "text");

  const handleSignUp = async () => {
    const canProceed = submitDebouncer.current(() => {});
    if (!canProceed || loading) return;

    const problem = validateSignupInput({ email, password, passwordConfirm, code });
    if (problem) {
      setErrorMessage(problem);
      return;
    }

    setErrorMessage(null);
    setLoading(true);

    try {
      // Sign-up runs through a dedicated endpoint rather than a record create:
      // the users collection stays closed, so this is the only way in.
      await pb.send("/api/dgh/signup", {
        method: "POST",
        body: {
          email: email.trim().toLowerCase(),
          password,
          passwordConfirm,
          code: normaliseInviteCode(code),
        },
      });

      // Sign in on the ordinary path so there is one well-tested route in.
      await pb.collection("users").authWithPassword(email.trim().toLowerCase(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // The auth context sees a signed-in user on an auth screen and sends it
      // to onboarding, because a new account has no name yet.
      router.replace("/(tabs)");
    } catch (error: any) {
      const status = error?.status;
      if (status === 400) {
        // The server's messages are already written for the person reading them.
        setErrorMessage(
          error?.response?.message || "Could not create your account. Please check your details."
        );
      } else if (status === 404) {
        setErrorMessage("Sign-up is not available on this server.");
      } else if (status === 429) {
        setErrorMessage("Too many attempts. Please wait a few minutes and try again.");
      } else if (status === 0) {
        setErrorMessage("Could not reach the server. Check your connection and try again.");
      } else {
        setErrorMessage("Something went wrong creating your account. Please try again.");
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: Math.max(insets.top, 20) + 40,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.branding}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logo}
              contentFit="contain"
            />
            <ThemedText type="title" style={styles.appTitle}>
              Daily Games Hub
            </ThemedText>
            <ThemedText style={styles.byline}>by Serhan Handani</ThemedText>
          </View>

          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              Create your account
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              You will need the invite code you were given.
            </ThemedText>
          </View>

          <View style={[styles.form, { backgroundColor: cardBackground, borderColor }]}>
            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBackground, borderColor, color: textColor }]}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Password</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBackground, borderColor, color: textColor }]}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Confirm password</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBackground, borderColor, color: textColor }]}
                value={passwordConfirm}
                onChangeText={setPasswordConfirm}
                placeholder="Type it again"
                placeholderTextColor="#999"
                secureTextEntry
                autoCapitalize="none"
                editable={!loading}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={styles.label}>Invite code</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: inputBackground, borderColor, color: textColor }]}
                value={code}
                onChangeText={setCode}
                placeholder="e.g. 7F3K2QB9XA4M"
                placeholderTextColor="#999"
                autoCapitalize="characters"
                autoCorrect={false}
                editable={!loading}
                onSubmitEditing={handleSignUp}
              />
              <ThemedText style={styles.hint}>
                Spaces and dashes do not matter.
              </ThemedText>
            </View>

            {errorMessage ? (
              <ThemedText style={styles.errorText}>{errorMessage}</ThemedText>
            ) : null}

            <Pressable
              style={[
                styles.submitButton,
                { backgroundColor: tintColor },
                loading && styles.buttonDisabled,
              ]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" />
                  <ThemedText style={styles.loadingText}>Creating account...</ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.submitButtonText}>Create account</ThemedText>
              )}
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Pressable
              onPress={() => router.replace("/auth/login" as any)}
              hitSlop={8}
              disabled={loading}
            >
              <ThemedText style={[styles.footerLink, { color: tintColor }]}>
                Already have an account? Sign in
              </ThemedText>
            </Pressable>
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
  hint: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.6,
    marginTop: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
  },
  submitButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
  },
  submitButtonText: {
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
  footer: {
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    gap: 8,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
