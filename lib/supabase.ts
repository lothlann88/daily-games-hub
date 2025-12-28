import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase] Missing credentials. Cloud features will be disabled.");
}

const isServer = typeof window === "undefined";

// Avoid using AsyncStorage or persisting sessions during server-side rendering
// (e.g., when Vercel runs `expo export --platform web`). `@supabase/auth-js`
// tries to read from the provided storage during initialization, and the web
// version of AsyncStorage depends on `window`. That crashes SSR builds with
// "ReferenceError: window is not defined".
const authConfig = isServer
  ? {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    }
  : {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
    };

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: authConfig,
});

// Test connection
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from("user_profiles").select("count").limit(1);
    if (error) {
      console.error("[Supabase] Connection test failed:", error.message);
      return false;
    }
    console.log("[Supabase] Connection successful");
    return true;
  } catch (error) {
    console.error("[Supabase] Connection test error:", error);
    return false;
  }
}
