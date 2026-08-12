import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors, Fonts } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { APP_VERSION, CHANGELOG, unseenReleases, type ChangelogRelease } from "@/lib/changelog";
import { pb } from "@/lib/pocketbase";

const SERIF = Fonts!.serif;
const SANS = Fonts!.sans;

const STORAGE_KEY = "lastSeenVersion";

// Captured at bundle load, before any routing: a fresh visitor boots
// unauthenticated on the login page, while an existing user upgrading from a
// build without version tracking boots straight into the app signed in.
const wasSignedInAtBoot = pb.authStore.isValid;

// After an update reloads the app, surface the changelog entries the user
// hasn't seen. Mounted inside the authenticated tabs shell so it never covers
// the login or onboarding screens. Dismissing records the current version;
// until then the pop-up returns on the next load, which is the honest reading
// of "unseen".
export function WhatsNew() {
  const scheme = useColorScheme() ?? "light";
  const palette = Colors[scheme];
  const [releases, setReleases] = useState<ChangelogRelease[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const lastSeen = await AsyncStorage.getItem(STORAGE_KEY);
      if (cancelled) return;
      if (lastSeen === null) {
        if (wasSignedInAtBoot) {
          // Upgrading from before version tracking: we can't know how far
          // back they've seen, so show the newest release only.
          setReleases(CHANGELOG.slice(0, 1));
        } else {
          // Genuine first visit: start tracking quietly, no pop-up.
          await AsyncStorage.setItem(STORAGE_KEY, APP_VERSION);
        }
        return;
      }
      setReleases(unseenReleases(lastSeen));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    AsyncStorage.setItem(STORAGE_KEY, APP_VERSION).catch(() => {});
    setReleases([]);
  };

  if (releases.length === 0) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: palette.surface, borderColor: palette.hairline },
          ]}
        >
          <Text style={[styles.eyebrow, { color: palette.tint, fontFamily: SERIF }]}>
            — What’s new —
          </Text>
          <Text style={[styles.title, { color: palette.text, fontFamily: SERIF }]}>
            v{releases[0].version}
          </Text>
          <ScrollView style={styles.entries} showsVerticalScrollIndicator={false}>
            {releases.map((release) => (
              <View key={release.version} style={styles.release}>
                {releases.length > 1 && (
                  <Text
                    style={[styles.releaseVersion, { color: palette.text, fontFamily: SANS }]}
                  >
                    v{release.version}
                  </Text>
                )}
                {release.entries.map((entry) => (
                  <View key={entry} style={styles.entryRow}>
                    <Text style={[styles.entryBullet, { color: palette.tint }]}>·</Text>
                    <Text
                      style={[styles.entryText, { color: palette.muted, fontFamily: SANS }]}
                    >
                      {entry}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          <Pressable
            onPress={dismiss}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: palette.ink, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.buttonLabel, { color: palette.bg, fontFamily: SANS }]}>
              Continue
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 4,
    borderWidth: 1,
    paddingTop: 22,
    paddingHorizontal: 22,
    paddingBottom: 20,
  },
  eyebrow: {
    fontSize: 11,
    fontStyle: "italic",
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontWeight: "500",
    letterSpacing: -0.6,
    marginBottom: 14,
  },
  entries: {
    maxHeight: 320,
    marginBottom: 18,
  },
  release: {
    marginBottom: 10,
  },
  releaseVersion: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 6,
  },
  entryRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  entryBullet: {
    fontSize: 14,
    lineHeight: 20,
  },
  entryText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    borderRadius: 4,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
});
