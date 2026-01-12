import { describe, it, expect } from "vitest";
import { supabase, testSupabaseConnection } from "../lib/supabase";

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabaseAnonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);
const maybeIt = hasSupabaseEnv ? it : it.skip;

describe("Supabase Connection", () => {
  maybeIt("should have valid credentials configured", () => {
    expect(supabaseUrl).toBeDefined();
    expect(supabaseAnonKey).toBeDefined();
    expect(supabaseUrl).toContain("supabase.co");
  });

  it("should create supabase client successfully", () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });

  maybeIt("should connect to Supabase successfully", async () => {
    const connected = await testSupabaseConnection();
    expect(connected).toBe(true);
  }, 10000); // 10 second timeout for network request
});
