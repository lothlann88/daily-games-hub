import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("[Supabase] Missing credentials. Cloud features will be disabled.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
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
