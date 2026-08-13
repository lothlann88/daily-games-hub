import { useEffect, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

import { useThemePreferenceContext } from "@/contexts/theme-context";

/**
 * To support static rendering, this value needs to be re-calculated on the
 * client side for web. After hydration the user's Settings → Appearance
 * choice overrides the system scheme.
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  const colorScheme = useRNColorScheme();
  const ctx = useThemePreferenceContext();

  if (!hasHydrated) {
    return "light";
  }

  if (ctx && ctx.preference !== "system") return ctx.preference;
  return colorScheme;
}
