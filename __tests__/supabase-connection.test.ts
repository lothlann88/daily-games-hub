import { describe, it, expect } from "vitest";
import { supabase, testSupabaseConnection } from "../lib/supabase";

describe("Supabase Connection", () => {
  it("should have valid credentials configured", () => {
    expect(process.env.SUPABASE_URL).toBeDefined();
    expect(process.env.SUPABASE_ANON_KEY).toBeDefined();
    expect(process.env.SUPABASE_URL).toContain("supabase.co");
  });

  it("should create supabase client successfully", () => {
    expect(supabase).toBeDefined();
    expect(supabase.auth).toBeDefined();
  });

  it("should connect to Supabase successfully", async () => {
    const connected = await testSupabaseConnection();
    expect(connected).toBe(true);
  }, 10000); // 10 second timeout for network request
});
