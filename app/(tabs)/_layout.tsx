import { Tabs, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { EditorialTabBar } from "@/components/editorial-tab-bar";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { hasCompletedOnboarding } from "@/lib/storage";

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      const completed = await hasCompletedOnboarding();
      if (!completed) {
        router.replace("/onboarding");
      }
      setIsCheckingOnboarding(false);
    };
    checkOnboarding();
  }, []);

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
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <EditorialTabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: "Games" }} />
      <Tabs.Screen name="leaderboard" options={{ title: "Stats" }} />
      <Tabs.Screen name="friends" options={{ title: "Friends" }} />
      <Tabs.Screen name="settings" options={{ title: "You" }} />
    </Tabs>
  );
}
