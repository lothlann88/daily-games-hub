import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useRouter, useSegments } from "expo-router";
import { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { hasCompletedOnboarding } from "@/lib/storage";
import { syncData } from "@/lib/sync";
import { SyncStatus, SyncError } from "@/types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  syncing: boolean;
  syncStatus: SyncStatus;
  syncError: SyncError | null;
  lastSyncTime: number | null;
  signOut: () => Promise<void>;
  retrySync: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  syncing: false,
  syncStatus: "idle",
  syncError: null,
  lastSyncTime: null,
  signOut: async () => {},
  retrySync: async () => {},
});

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<SyncError | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const router = useRouter();
  const segments = useSegments();
  const retrySyncRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    const timeouts: ReturnType<typeof setTimeout>[] = [];

    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      // Sync data for returning users
      if (session?.user) {
        console.log("[Auth] Returning user detected, syncing data...");
        setSyncing(true);
        setSyncStatus("syncing");

        const result = await syncData();

        if (result.success) {
          setLastSyncTime(Date.now());
          setSyncStatus("success");
          setSyncError(null);
          console.log("[Auth] Initial sync completed successfully");
        } else {
          setSyncStatus("error");
          setSyncError(result.error || null);
          console.error("[Auth] Initial sync failed:", result.error);

          // Auto-retry after 30 seconds if retryable
          if (result.error?.retryable) {
            console.log("[Auth] Scheduling auto-retry in 30 seconds...");
            const tid = setTimeout(() => {
              retrySyncRef.current?.();
            }, 30000);
            timeouts.push(tid);
          }
        }

        setSyncing(false);
      }

      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("[Auth] State changed:", _event, session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);

      // Trigger sync when user signs in
      if (_event === "SIGNED_IN" && session?.user) {
        console.log("[Auth] User signed in, triggering data sync...");
        setSyncing(true);
        setSyncStatus("syncing");

        const result = await syncData();

        if (result.success) {
          setLastSyncTime(Date.now());
          setSyncStatus("success");
          setSyncError(null);
          console.log("[Auth] Data sync completed successfully");
        } else {
          setSyncStatus("error");
          setSyncError(result.error || null);
          console.error("[Auth] Data sync failed:", result.error);

          // Auto-retry after 30 seconds if retryable
          if (result.error?.retryable) {
            console.log("[Auth] Scheduling auto-retry in 30 seconds...");
            const tid = setTimeout(() => {
              retrySyncRef.current?.();
            }, 30000);
            timeouts.push(tid);
          }
        }

        setSyncing(false);
      }

      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      timeouts.forEach(clearTimeout);
    };
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";
    const allowedSegments = new Set([
      "(tabs)",
      "game-detail",
      "add-game",
      "add-friend",
      "modal",
      "oauth",
      "auth-test",
    ]);
    const isAllowedSegment = segments[0] ? allowedSegments.has(segments[0]) : true;

    if (!user && !inAuthGroup) {
      // Not authenticated and not in auth screens -> redirect to login
      console.log("[Auth] Not authenticated, redirecting to login");
      router.replace("/auth/login" as any);
    } else if (user && inAuthGroup) {
      // Authenticated but in auth screens -> check onboarding and redirect
      checkOnboardingAndRedirect();
    } else if (user && !inOnboarding && !inAuthGroup && !isAllowedSegment) {
      // Authenticated, not in onboarding, not in tabs -> check onboarding
      checkOnboardingAndRedirect();
    }
  }, [user, loading, segments]);

  const checkOnboardingAndRedirect = async () => {
    const completed = await hasCompletedOnboarding();
    if (!completed) {
      console.log("[Auth] Onboarding not completed, redirecting");
      router.replace("/onboarding" as any);
    } else {
      console.log("[Auth] Redirecting to home");
      router.replace("/(tabs)" as any);
    }
  };

  const retrySync = async () => {
    if (!user) {
      console.log("[Auth] Cannot retry sync - no user");
      return;
    }

    console.log("[Auth] Retrying sync...");
    setSyncing(true);
    setSyncStatus("syncing");
    setSyncError(null);

    const result = await syncData();

    if (result.success) {
      setLastSyncTime(Date.now());
      setSyncStatus("success");
      setSyncError(null);
      console.log("[Auth] Sync retry successful");
    } else {
      setSyncStatus("error");
      setSyncError(result.error || null);
      console.error("[Auth] Sync retry failed:", result.error);
    }

    setSyncing(false);
  };

  retrySyncRef.current = retrySync;

  const signOut = async () => {
    try {
      console.log("[Auth] Sign out initiated");

      if (!isSupabaseConfigured()) {
        console.warn("[Auth] Supabase not configured, skipping remote sign out");
      } else {
        console.log("[Auth] Calling supabase.auth.signOut()...");
        try {
          const { error } = await supabase.auth.signOut();
          if (error) {
            console.error("[Auth] Sign out error:", error);
            // Don't throw - continue with local cleanup
          }
        } catch (error: any) {
          console.error("[Auth] Supabase sign out threw exception:", error);
          // Continue with local cleanup even if Supabase fails
        }
      }

      console.log("[Auth] Sign out successful");
    } catch (error: any) {
      console.error("[Auth] Sign out failed:", error);
      console.error("[Auth] Error details:", {
        message: error?.message,
        name: error?.name,
        stack: error?.stack,
      });
    } finally {
      // Even if sign out fails, clear local state and redirect
      console.log("[Auth] Clearing local state and redirecting to login...");
      setUser(null);
      setSession(null);
      setSyncing(false);
      setSyncStatus("idle");
      setSyncError(null);
      setLastSyncTime(null);
      router.replace("/auth/login" as any);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, syncing, syncStatus, syncError, lastSyncTime, signOut, retrySync }}>
      {children}
    </AuthContext.Provider>
  );
}
