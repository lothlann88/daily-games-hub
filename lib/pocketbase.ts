import PocketBase from "pocketbase";

// In production the web build is served by PocketBase itself from pb_public,
// so a relative base URL means same-origin — no env var baked into the build.
// In dev, .env.development points this at the local PocketBase instance.
// (The dormant native app path would need an AsyncStorage-backed auth store
// and an absolute URL; web uses the SDK's default localStorage store.)
export const pb = new PocketBase(process.env.EXPO_PUBLIC_PB_URL || "/");

// The SDK's key-based auto-cancellation aborts legitimate concurrent requests
// (e.g. parallel list fetches during sync).
pb.autoCancellation(false);

/** The signed-in user's record id, or null. */
export function currentUserId(): string | null {
  return pb.authStore.record?.id ?? null;
}
