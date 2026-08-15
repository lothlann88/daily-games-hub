// The update log shown in Settings → About and in the What's new pop-up.
// Newest release first. Every user-visible change adds an entry here and
// bumps the version in package.json and app.config.ts (patch for fixes,
// minor for features) — see CLAUDE.md. Entries are user-facing prose.
export interface ChangelogRelease {
  version: string;
  date: string; // ISO date
  entries: string[];
}

export const CHANGELOG: ChangelogRelease[] = [
  {
    version: "1.6.0",
    date: "2026-08-15",
    entries: [
      "Games now know their scoring direction — higher is better (points), lower is better (guesses, time), or unscored. Head-to-head rankings respect it, so the fewest Wordle guesses wins rather than the most. Set it when adding a game, or tap “scoring:” on a game's page to change it; your existing games have been set to sensible defaults.",
      "Heardle now points at Heardle Unlimited (heardle.info) — the original shut down.",
    ],
  },
  {
    version: "1.5.0",
    date: "2026-08-15",
    entries: [
      "Mislogged a play? Tap any entry in a game's Ledger to change its result, score or note — or delete it entirely. Deleting a play also un-counts it from your streak, and corrections carry across to the other player's view.",
    ],
  },
  {
    version: "1.4.0",
    date: "2026-08-13",
    entries: [
      "Duolingo joins the library under a new Language category.",
      "Syncing between devices now merges instead of overwriting: plays logged on both phones the same day both count towards the streak, and games you add or rename on one device no longer vanish after the next sync.",
      "Sort the library your way — tap the title count on the § Library line to switch between smart, streak, A–Z and recently played. Favourites stay pinned on top.",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-08-13",
    entries: [
      "Choose your look: Settings → Appearance now offers System, Light and Dark. The app still follows your device unless you pick one.",
    ],
  },
  {
    version: "1.2.1",
    date: "2026-08-12",
    entries: [
      "The games list now refreshes itself when you come back to it, so a play you've just logged shows up straight away instead of after a pull-to-refresh.",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-08-12",
    entries: [
      "New Logic & Deduction category: Clues by Sam, Murdle, Sudoku, Nerdle and LinkedIn Queens have moved there — existing libraries update themselves — and it's available in the category chips and when adding a game.",
    ],
  },
  {
    version: "1.1.1",
    date: "2026-08-12",
    entries: [
      "Clues by Sam joins the library — a daily deduction puzzle where you tap suspects to reveal clues and work out who's guilty. It appears in everyone's library automatically.",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-08-12",
    entries: [
      "Favourite games: tap the star on a game's page and it stays pinned to the top of the library.",
      "Filter the library by category — the chips under the search box narrow the list and combine with search.",
      "This update log: Settings → About now lists what has changed, and after each update a What's new pop-up shows anything you haven't seen.",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-08-11",
    entries: [
      "First release in the app's self-hosted home at dailygame.handani.dev: the games library, score logging, streaks, stats, friends and head-to-head — installable on your phone as an app.",
    ],
  },
];

// Single source of truth for the running version; package.json and
// app.config.ts must be kept in step with it.
export const APP_VERSION = CHANGELOG[0].version;

// Numeric semver comparison: positive when a > b.
export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

// Releases newer than the version the user last saw, newest first — the
// content of the What's new pop-up. A null last-seen means a first visit:
// nothing counts as unseen (the version is recorded quietly instead), so
// fresh sign-ins aren't greeted with a release-notes pop-up.
export function unseenReleases(lastSeen: string | null): ChangelogRelease[] {
  if (lastSeen === null) return [];
  return CHANGELOG.filter((release) => compareVersions(release.version, lastSeen) > 0);
}
