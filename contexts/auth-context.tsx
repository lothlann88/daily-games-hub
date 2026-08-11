import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { useRouter, useSegments } from "expo-router";
import type { AuthRecord } from "pocketbase";
import { pb } from "@/lib/pocketbase";
import { hasCompletedOnboarding } from "@/lib/storage";
import { syncData, clearSyncStatus } from "@/lib/sync";
import { SyncStatus, SyncError } from "@/types";

interface AuthContextType {
  user: AuthRecord | null;
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
  // pb.authStore.record re-parses its backing storage on every access and
  // returns a fresh object, so it must be read once per change and cached in
  // state — never used directly as a render-time snapshot.
  const [user, setUser] = useState<AuthRecord | null>(() =>
    pb.authStore.isValid ? pb.authStore.record : null,
  );
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<SyncError | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
  const router = useRouter();
  const segments = useSegments();
  const retrySyncRef = useRef<() => Promise<void>>(async () => {});
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  // Tracked in a ref because the onChange subscription is set up once and
  // would otherwise close over the mount-time `user` value.
  const wasAuthenticatedRef = useRef<boolean>(pb.authStore.isValid);

  const runSync = async () => {
    setSyncing(true);
    setSyncStatus("syncing");

    const result = await syncData();

    if (result.success) {
      setLastSyncTime(Date.now());
      setSyncStatus("success");
      setSyncError(null);
      console.log("[Auth] Sync completed successfully");
    } else {
      setSyncStatus("error");
      setSyncError(result.error || null);
      console.error("[Auth] Sync failed:", result.error);

      // Auto-retry after 30 seconds if retryable
      if (result.error?.retryable) {
        console.log("[Auth] Scheduling auto-retry in 30 seconds...");
        const tid = setTimeout(() => {
          retrySyncRef.current?.();
        }, 30000);
        timeoutsRef.current.push(tid);
      }
    }

    setSyncing(false);
  };

  useEffect(() => {
    let cancelled = false;
    const timeouts = timeoutsRef.current;

    // Listen for auth changes (login, logout, token refresh)
    const unsubscribe = pb.authStore.onChange((_token, record) => {
      const wasAuthenticated = wasAuthenticatedRef.current;
      const isAuthenticated = pb.authStore.isValid && record !== null;
      wasAuthenticatedRef.current = isAuthenticated;
      console.log("[Auth] State changed:", { isAuthenticated, userId: record?.id });
      setUser(isAuthenticated ? record : null);

      // Trigger sync when user signs in
      if (!wasAuthenticated && isAuthenticated) {
        console.log("[Auth] User signed in, triggering data sync...");
        void runSync();
      }
    });

    // Validate any persisted session, then sync for returning users
    (async () => {
      if (pb.authStore.isValid) {
        try {
          await pb.collection("users").authRefresh();
        } catch (error: any) {
          // 401/403/404 mean the token or account is no longer valid; network
          // failures keep the session for offline use of local data.
          if (error?.status === 401 || error?.status === 403 || error?.status === 404) {
            console.log("[Auth] Stored session invalid, clearing");
            pb.authStore.clear();
          } else {
            console.warn("[Auth] Could not validate session (offline?):", error?.message);
          }
        }

        if (!cancelled && pb.authStore.isValid) {
          console.log("[Auth] Returning user detected, syncing data...");
          setUser(pb.authStore.record);
          await runSync();
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
      unsubscribe();
      timeouts.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle navigation based on auth state. Also waits while a sync is in
  // flight: the first sync on a new device decides whether onboarding is
  // needed (it adopts an existing cloud profile), so redirecting before it
  // finishes would bounce an already-onboarded user into onboarding again.
  useEffect(() => {
    if (loading || syncing) return;

    const inAuthGroup = segments[0] === "auth";
    const inOnboarding = segments[0] === "onboarding";
    const allowedSegments = new Set([
      "(tabs)",
      "game-detail",
      "add-game",
      "add-friend",
      "modal",
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
  }, [user, loading, syncing, segments]);

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
    setSyncError(null);
    await runSync();
  };

  retrySyncRef.current = retrySync;

  const signOut = async () => {
    console.log("[Auth] Sign out initiated");
    pb.authStore.clear();
    await clearSyncStatus();
    setUser(null);
    setSyncing(false);
    setSyncStatus("idle");
    setSyncError(null);
    setLastSyncTime(null);
    router.replace("/auth/login" as any);
  };

  return (
    <AuthContext.Provider value={{ user, loading, syncing, syncStatus, syncError, lastSyncTime, signOut, retrySync }}>
      {children}
    </AuthContext.Provider>
  );
}
