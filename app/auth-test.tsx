import { useState } from "react";
import {
  StyleSheet,
  View,
  Pressable,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { supabase } from "@/lib/supabase";

export default function AuthTestScreen() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [testEmail, setTestEmail] = useState("");
  const [testPassword, setTestPassword] = useState("");
  const insets = useSafeAreaInsets();
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "card");
  const borderColor = useThemeColor({}, "cardBorder");
  const inputBackground = useThemeColor({ light: "#FFFFFF", dark: "#2C2C2E" }, "background");

  const addResult = (message: string) => {
    console.log("[AuthTest]", message);
    setResults((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const testSupabaseConfig = async () => {
    setTesting(true);
    setResults([]);
    
    try {
      addResult("=== Testing Supabase Configuration ===");
      
      // Check environment variables
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      
      addResult(`Supabase URL: ${supabaseUrl ? supabaseUrl.substring(0, 30) + "..." : "NOT SET"}`);
      addResult(`Supabase Key: ${supabaseKey ? "SET (length: " + supabaseKey.length + ")" : "NOT SET"}`);
      
      if (!supabaseUrl || !supabaseKey) {
        addResult("❌ ERROR: Supabase credentials not configured!");
        return;
      }
      
      addResult("✅ Environment variables are set");
      
      // Test Supabase client initialization
      addResult("Testing Supabase client...");
      
      try {
        const { data, error } = await supabase.auth.getSession();
        addResult(`getSession result: ${error ? "ERROR: " + error.message : "Success (session: " + (data.session ? "exists" : "null") + ")"}`);
        
        if (error) {
          addResult("❌ Supabase client error: " + error.message);
        } else {
          addResult("✅ Supabase client is working");
        }
      } catch (err: any) {
        addResult("❌ Exception calling getSession: " + err.message);
      }
      
      addResult("=== Test Complete ===");
      
    } catch (error: any) {
      addResult("❌ Test failed: " + error.message);
    } finally {
      setTesting(false);
    }
  };

  const testSignIn = async () => {
    if (!testEmail.trim() || !testPassword.trim()) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    setTesting(true);
    setResults([]);
    
    try {
      addResult("=== Testing Sign In ===");
      addResult(`Email: ${testEmail.trim()}`);
      addResult("Calling supabase.auth.signInWithPassword...");
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail.trim(),
        password: testPassword,
      });
      
      addResult(`Response: ${JSON.stringify({ hasData: !!data, hasUser: !!data?.user, hasError: !!error }, null, 2)}`);
      
      if (error) {
        addResult("❌ Sign in error: " + error.message);
        Alert.alert("Sign In Failed", error.message);
      } else if (data?.user) {
        addResult("✅ Sign in successful!");
        addResult(`User ID: ${data.user.id}`);
        addResult(`Email: ${data.user.email}`);
        Alert.alert("Success", "Sign in successful! Check console for details.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
    } catch (error: any) {
      addResult("❌ Exception: " + error.message);
      Alert.alert("Error", error.message);
    } finally {
      setTesting(false);
    }
  };

  const testSignUp = async () => {
    if (!testEmail.trim() || !testPassword.trim()) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    if (testPassword.length < 8) {
      Alert.alert("Error", "Password must be at least 8 characters");
      return;
    }

    setTesting(true);
    setResults([]);
    
    try {
      addResult("=== Testing Sign Up ===");
      addResult(`Email: ${testEmail.trim()}`);
      addResult("Calling supabase.auth.signUp...");
      
      const { data, error } = await supabase.auth.signUp({
        email: testEmail.trim(),
        password: testPassword,
      });
      
      addResult(`Response: ${JSON.stringify({ hasData: !!data, hasUser: !!data?.user, hasError: !!error }, null, 2)}`);
      
      if (error) {
        addResult("❌ Sign up error: " + error.message);
        Alert.alert("Sign Up Failed", error.message);
      } else if (data?.user) {
        addResult("✅ Sign up successful!");
        addResult(`User ID: ${data.user.id}`);
        addResult(`Email: ${data.user.email}`);
        addResult(`Email confirmed: ${data.user.email_confirmed_at ? "Yes" : "No - check email for confirmation link"}`);
        Alert.alert("Success", "Sign up successful! " + (data.user.email_confirmed_at ? "" : "Check your email for confirmation link."));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      
    } catch (error: any) {
      addResult("❌ Exception: " + error.message);
      Alert.alert("Error", error.message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top, 20) + 20,
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        <ThemedText type="title" style={styles.title}>
          Authentication Test
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Use this page to diagnose authentication issues
        </ThemedText>

        {/* Test Credentials */}
        <View style={[styles.section, { backgroundColor: cardBackground, borderColor }]}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Test Credentials
          </ThemedText>
          
          <TextInput
            style={[styles.input, { backgroundColor: inputBackground, borderColor, color: tintColor }]}
            placeholder="Email"
            placeholderTextColor="#999"
            value={testEmail}
            onChangeText={setTestEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          
          <TextInput
            style={[styles.input, { backgroundColor: inputBackground, borderColor, color: tintColor }]}
            placeholder="Password (min 8 chars)"
            placeholderTextColor="#999"
            value={testPassword}
            onChangeText={setTestPassword}
            secureTextEntry
          />
        </View>

        {/* Test Buttons */}
        <View style={styles.buttonGroup}>
          <Pressable
            onPress={testSupabaseConfig}
            disabled={testing}
            style={[styles.button, { backgroundColor: tintColor }]}
          >
            {testing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Test Configuration</ThemedText>
            )}
          </Pressable>

          <Pressable
            onPress={testSignIn}
            disabled={testing}
            style={[styles.button, { backgroundColor: "#10B981" }]}
          >
            {testing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Test Sign In</ThemedText>
            )}
          </Pressable>

          <Pressable
            onPress={testSignUp}
            disabled={testing}
            style={[styles.button, { backgroundColor: "#F59E0B" }]}
          >
            {testing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText style={styles.buttonText}>Test Sign Up</ThemedText>
            )}
          </Pressable>
        </View>

        {/* Results */}
        {results.length > 0 && (
          <View style={[styles.results, { backgroundColor: cardBackground, borderColor }]}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Test Results
            </ThemedText>
            {results.map((result, index) => (
              <ThemedText key={index} style={styles.resultText}>
                {result}
              </ThemedText>
            ))}
          </View>
        )}

        <View style={styles.instructions}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Instructions
          </ThemedText>
          <ThemedText style={styles.instructionText}>
            1. Click "Test Configuration" to verify Supabase is set up correctly
          </ThemedText>
          <ThemedText style={styles.instructionText}>
            2. Enter email and password above
          </ThemedText>
          <ThemedText style={styles.instructionText}>
            3. Click "Test Sign Up" to create a new account
          </ThemedText>
          <ThemedText style={styles.instructionText}>
            4. Click "Test Sign In" to sign in with existing account
          </ThemedText>
          <ThemedText style={styles.instructionText}>
            5. Check results below and browser console (F12) for detailed logs
          </ThemedText>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
    opacity: 0.7,
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
  },
  buttonGroup: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  results: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  resultText: {
    fontSize: 12,
    fontFamily: "monospace",
    marginBottom: 4,
  },
  instructions: {
    marginTop: 24,
  },
  instructionText: {
    marginBottom: 8,
    opacity: 0.8,
  },
});
