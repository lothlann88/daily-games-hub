import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, useSegments } from "expo-router";
import { User, Session } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import * as Auth from "@/lib/auth";
import * as Api from "@/lib/api";
import { hasCompletedOnboarding } from "@/lib/storage";
import { syncData } from "@/lib/sync";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  syncing: boolean;
  lastSyncTime: number | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  syncing: false,
  lastSyncTime: null,
  signOut: async () => {},
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
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      // Sync data for returning users
      if (session?.user) {
        console.log("[Auth] Returning user detected, syncing data...");
        setSyncing(true);
        try {
          await syncData();
          setLastSyncTime(Date.now());
          console.log("[Auth] Initial sync completed");
        } catch (error) {
          console.error("[Auth] Initial sync failed:", error);
          // Don't block app start on sync failure
        } finally {
          setSyncing(false);
        }
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
        try {
          await syncData();
          setLastSyncTime(Date.now());
          console.log("[Auth] Data sync completed successfully");
        } catch (error) {
          console.error("[Auth] Data sync failed:", error);
          // Don't block login on sync failure
        } finally {
          setSyncing(false);
        }
      }
      
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle navigation based on auth state
  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";

    if (!user && !inAuthGroup) {
      // Not authenticated and not in auth screens -> redirect to login
      console.log("[Auth] Not authenticated, redirecting to login");
      router.replace("/auth/login" as any);
    } else if (user && inAuthGroup) {
      // Authenticated but in auth screens -> check onboarding and redirect
      checkOnboardingAndRedirect();
    } else if (user && !inOnboarding && segments[0] !== "(tabs)") {
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

  const signOut = async () => {
    try {
      console.log("[Auth] Sign out initiated");

      const [sessionToken, cachedUser] = await Promise.all([
        Auth.getSessionToken(),
        Auth.getUserInfo(),
      ]);
      const hasOAuthSession = Boolean(sessionToken || cachedUser);

      if (hasOAuthSession) {
        console.log("[Auth] OAuth session detected, calling Api.logout()");
        try {
          await Api.logout();
        } catch (error) {
          console.error("[Auth] OAuth logout API call failed:", error);
        }
        await Auth.removeSessionToken();
        await Auth.clearUserInfo();
      } else if (!isSupabaseConfigured()) {
        console.warn("[Auth] Supabase not configured, skipping remote sign out");
        // Skip Supabase call but still clear local state
      } else {
        // Call Supabase sign out
        console.log("[Auth] Calling supabase.auth.signOut()...");
        const { error } = await supabase.auth.signOut();

        if (error) {
          console.error("[Auth] Sign out error:", error);
          throw error;
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
      setLastSyncTime(null);
      router.replace("/auth/login" as any);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, syncing, lastSyncTime, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
