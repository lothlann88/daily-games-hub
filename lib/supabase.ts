import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

const isServer = typeof window === "undefined";

// Lazy-loaded Supabase client to avoid SSR errors
let supabaseInstance: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  // Return existing instance if already created
  if (supabaseInstance) {
    return supabaseInstance;
  }

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[Supabase] Missing credentials. Cloud features will be disabled.");
    // Return a dummy client that won't crash but won't work either
    // This allows the app to build and run without Supabase
    supabaseInstance = createClient("https://placeholder.supabase.co", "placeholder-key", {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
    return supabaseInstance;
  }

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

  supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: authConfig,
  });

  return supabaseInstance;
}

// Export a Proxy that lazily initializes the client and properly binds methods
export const supabase = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    const client = getSupabaseClient();
    const value = client[prop as keyof SupabaseClient];
    
    // If the property is a function, bind it to the client to preserve context
    if (typeof value === "function") {
      return value.bind(client);
    }
    
    // If the property is an object (like 'auth' or 'from'), return a proxy for it too
    // This ensures nested methods (like auth.signOut()) also get properly bound
    if (typeof value === "object" && value !== null) {
      return new Proxy(value, {
        get(nestedTarget, nestedProp) {
          const nestedValue = nestedTarget[nestedProp as keyof typeof nestedTarget];
          
          // Bind nested methods to preserve context
          if (typeof nestedValue === "function") {
            return (nestedValue as Function).bind(nestedTarget);
          }
          
          return nestedValue;
        },
      });
    }
    
    return value;
  },
});

// Test connection
export async function testSupabaseConnection(): Promise<boolean> {
  try {
    const client = getSupabaseClient();
    const { data, error} = await client.from("user_profiles").select("count").limit(1);
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
