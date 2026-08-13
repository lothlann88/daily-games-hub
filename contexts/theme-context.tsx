import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

export type ThemePreference = "system" | "light" | "dark";

const STORAGE_KEY = "themePreference";

interface ThemePreferenceValue {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

const ThemePreferenceContext = createContext<ThemePreferenceValue | null>(null);

// Holds the user's appearance choice (Settings → Appearance). "system" defers
// to the device scheme; the resolution happens in hooks/use-color-scheme so
// every existing call site honours the override without changes.
export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const [preference, setPreferenceState] = useState<ThemePreference>("system");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark") setPreferenceState(stored);
      })
      .catch(() => {});
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const value = useMemo(() => ({ preference, setPreference }), [preference, setPreference]);

  return (
    <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>
  );
}

// Null-tolerant lookup: useColorScheme is also rendered in places without the
// provider (static export render), which must fall back to the system scheme.
export function useThemePreferenceContext(): ThemePreferenceValue | null {
  return useContext(ThemePreferenceContext);
}

export function useThemePreference(): ThemePreferenceValue {
  const ctx = useThemePreferenceContext();
  if (!ctx) {
    throw new Error("useThemePreference must be used within ThemePreferenceProvider");
  }
  return ctx;
}
