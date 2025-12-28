import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

// Lazy-loaded Supabase client to avoid SSR errors
let supabaseInstance: SupabaseClient | null = null;

function initializeSupabaseClient(): SupabaseClient {
  // Return existing instance if already created
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[Supabase] Missing credentials. Cloud features will be disabled.");
    // Return a dummy client that won't crash but won't work either
    supabaseInstance = createClient("https://placeholder.supabase.co", "placeholder-key", {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    return supabaseInstance;
  }

  // Only use AsyncStorage and session persistence in browser environment
  // During SSR (Vercel build), skip storage to avoid "window is not defined" errors
  const authConfig = isBrowser
    ? {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: Platform.OS === "web",
      }
    : {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      };

  console.log("[Supabase] Initializing client...", { isBrowser, hasUrl: !!supabaseUrl, hasKey: !!supabaseAnonKey });

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: authConfig,
  });

  return supabaseInstance;
}

// Export a function that returns the client (simplest approach)
// This avoids Proxy complexity and ensures methods work correctly
export function getSupabase(): SupabaseClient {
  return initializeSupabaseClient();
}

// For backward compatibility, also export as 'supabase'
// This getter ensures the client is initialized before use
export const supabase = {
  get auth() {
    return initializeSupabaseClient().auth;
  },
  get from() {
    return initializeSupabaseClient().from.bind(initializeSupabaseClient());
  },
  get storage() {
    return initializeSupabaseClient().storage;
  },
  get functions() {
    return initializeSupabaseClient().functions;
  },
  get channel() {
    return initializeSupabaseClient().channel.bind(initializeSupabaseClient());
  },
  get removeChannel() {
    return initializeSupabaseClient().removeChannel.bind(initializeSupabaseClient());
  },
  get removeAllChannels() {
    return initializeSupabaseClient().removeAllChannels.bind(initializeSupabaseClient());
  },
  get getChannels() {
    return initializeSupabaseClient().getChannels.bind(initializeSupabaseClient());
  },
  get rpc() {
    return initializeSupabaseClient().rpc.bind(initializeSupabaseClient());
  },
};

// Test connection
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const client = initializeSupabaseClient();
    const { data, error } = await client.from("user_profiles").select("count").limit(1);
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
