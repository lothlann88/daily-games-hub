import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter, useSegments } from "expo-router";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { hasCompletedOnboarding } from "@/lib/storage";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
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
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("[Auth] State changed:", _event, session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);
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
    await supabase.auth.signOut();
    router.replace("/auth/login" as any);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
