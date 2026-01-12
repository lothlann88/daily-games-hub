import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Check if we're in a browser environment
const isBrowser = typeof window !== "undefined";

// Lazy-loaded Supabase client to avoid SSR errors
let supabaseInstance: SupabaseClient | null = null;
let configError: string | null = null;

function getPlatformOS(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const reactNative = require("react-native") as { Platform?: { OS?: string } };
    if (reactNative?.Platform?.OS) {
      return reactNative.Platform.OS;
    }
  } catch (error) {
    // Ignore - default to web
  }
  return "web";
}

function initializeSupabaseClient(): SupabaseClient {
  // Return existing instance if already created
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    const error = "Supabase configuration missing. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.";
    console.error("[Supabase]", error);
    configError = error;
    
    // Create a minimal dummy client that will throw errors on use
    // This prevents crashes during SSR but makes auth failures explicit
    supabaseInstance = createClient("https://placeholder.supabase.co", "placeholder-key", {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    return supabaseInstance;
  }

  // Clear any previous config error
  configError = null;

  // Only enable session persistence in browser environment
  // During SSR (Vercel build), skip persistence to avoid "window is not defined" errors
  const platformOS = getPlatformOS();
  const authConfig = isBrowser
    ? {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: platformOS === "web",
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

// Check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== "https://placeholder.supabase.co");
}

// Get configuration error message if any
export function getSupabaseConfigError(): string | null {
  if (!isSupabaseConfigured()) {
    return "Cloud login is unavailable—missing Supabase configuration. Please contact support.";
  }
  return null;
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
    if (!isSupabaseConfigured()) {
      console.error("[Supabase] Cannot test connection: configuration missing");
      return false;
    }
    
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
