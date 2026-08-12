import { Tabs, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { EditorialTabBar } from "@/components/editorial-tab-bar";
import { WhatsNew } from "@/components/whats-new";
import { Colors } from "@/constants/theme";
import { useAuth } from "@/contexts/auth-context";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { hasCompletedOnboarding } from "@/lib/storage";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { loading, syncing } = useAuth();
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  // Wait for the first sync before reading the local onboarding flag: on a
  // new device the sync adopts an existing cloud profile and marks onboarding
  // complete, so checking too early bounces existing users into onboarding.
  useEffect(() => {
    if (loading || syncing) return;
    let cancelled = false;
    (async () => {
      const completed = await hasCompletedOnboarding();
      if (cancelled) return;
      if (!completed) {
        router.replace("/onboarding");
      }
      setIsCheckingOnboarding(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, syncing]);

  if (isCheckingOnboarding) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors[colorScheme ?? "light"].bg,
        }}
      >
        <ActivityIndicator size="large" color={Colors[colorScheme ?? "light"].tint} />
      </View>
    );
  }

  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <EditorialTabBar {...props} />}
      >
        <Tabs.Screen name="index" options={{ title: "Games" }} />
        <Tabs.Screen name="leaderboard" options={{ title: "Stats" }} />
        <Tabs.Screen name="friends" options={{ title: "Friends" }} />
        <Tabs.Screen name="settings" options={{ title: "You" }} />
      </Tabs>
      <WhatsNew />
    </>
  );
}
