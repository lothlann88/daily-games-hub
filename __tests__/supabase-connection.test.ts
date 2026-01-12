import { describe, it, expect } from "vitest";
import { supabase, testSupabaseConnection } from "../lib/supabase";

describe("Supabase Connection", () => {
  it("should have valid credentials configured", () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey =
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("[Supabase] Skipping credential assertions: env vars not set");
      return;
    }
    expect(supabaseUrl).toBeDefined();
    expect(supabaseAnonKey).toBeDefined();
    expect(supabaseUrl).toContain("supabase.co");
  });

  it("should create supabase client successfully", () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });

  it("should connect to Supabase successfully", async () => {
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnonKey =
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("[Supabase] Skipping connection test: env vars not set");
      return;
    }
    const connected = await testSupabaseConnection();
    expect(connected).toBe(true);
  }, 10000); // 10 second timeout for network request
});
