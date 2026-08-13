import { useColorScheme as useSystemColorScheme } from "react-native";

import { useThemePreferenceContext } from "@/contexts/theme-context";

// System scheme, overridable by the user's Settings → Appearance choice.
export function useColorScheme() {
  const system = useSystemColorScheme();
  const ctx = useThemePreferenceContext();
  if (ctx && ctx.preference !== "system") return ctx.preference;
  return system;
}
