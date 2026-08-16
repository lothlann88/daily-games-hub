import { describe, expect, it } from "vitest";

import { CATEGORIES } from "@/lib/categories";
import { applyGameRevisions, GAME_REVISIONS, SCORE_ORDER_SEEDS } from "@/lib/game-revisions";
import { faviconUrlFor } from "@/lib/logo-fetcher";
import type { Game } from "@/types";

function makeGame(id: string, overrides: Partial<Game> = {}): Game {
  return {
    id,
    name: id,
    url: "https://example.com",
    category: "Puzzles",
    icon: "",
    dateAdded: 0,
    currentStreak: 0,
    longestStreak: 0,
    playHistory: [],
    isFavorite: false,
    tags: [],
    ...overrides,
  };
}

describe("GAME_REVISIONS", () => {
  it("only assigns canonical categories", () => {
    for (const patch of Object.values(GAME_REVISIONS)) {
      if (patch.category) expect(CATEGORIES).toContain(patch.category);
    }
  });

  it("seeds a score direction for the whole default library", () => {
    for (const order of Object.values(SCORE_ORDER_SEEDS)) {
      expect(["higher", "lower", "none"]).toContain(order);
    }
  });

  it("restructures the Gamedle family onto its real mode URLs", () => {
    expect(GAME_REVISIONS.gamedle).toMatchObject({
      name: "Gamedle Guess",
      url: "https://gamedle.wtf/guess",
      category: "Video Games",
    });
    expect(GAME_REVISIONS["gamedle-classic"]).toMatchObject({ name: "Gamedle Cover Art" });
    expect(GAME_REVISIONS["gamedle-character"]).toMatchObject({
      url: "https://gamedle.wtf/characters",
    });
    expect(GAME_REVISIONS["gamedle-artwork"].categories).toEqual(["Video Games", "Trivia"]);
  });

  it("points heardle at Heardle Unlimited", () => {
    expect(GAME_REVISIONS.heardle).toMatchObject({
      name: "Heardle Unlimited",
      url: "https://www.heardle.info",
      scoreOrder: "lower",
    });
  });

  it("refreshes the logo of every game it moves to a new URL", () => {
    for (const patch of Object.values(GAME_REVISIONS)) {
      if (!patch.url) continue;
      expect(patch.logoUrl).toBe(faviconUrlFor(patch.url));
    }
    // The Spotify badge left over from heardle's old home is the case that
    // prompted this.
    expect(GAME_REVISIONS.heardle.logoUrl).toContain("www.heardle.info");
  });
});

describe("applyGameRevisions", () => {
  it("patches revised games and reports exactly the changed ones", () => {
    const games = [
      makeGame("heardle", { name: "Heardle", url: "https://www.spotify.com/heardle" }),
      makeGame("my-custom-game"),
    ];
    const { games: revised, changed } = applyGameRevisions(games);
    const heardle = revised.find((g) => g.id === "heardle")!;
    expect(heardle.name).toBe("Heardle Unlimited");
    expect(heardle.url).toBe("https://www.heardle.info");
    expect(heardle.scoreOrder).toBe("lower");
    expect(changed.map((g) => g.id)).toEqual(["heardle"]);
  });

  it("is idempotent, including for array-valued patches", () => {
    const games = [makeGame("heardle"), makeGame("gamedle")];
    const once = applyGameRevisions(games);
    const twice = applyGameRevisions(once.games);
    expect(twice.changed).toEqual([]);
    expect(twice.games[0]).toBe(once.games[0]);
    expect(twice.games[1]).toBe(once.games[1]);
  });

  it("applies the v1 category moves for devices that never ran them", () => {
    const { games } = applyGameRevisions([makeGame("sudoku", { category: "Puzzles" })]);
    expect(games[0].category).toBe("Logic & Deduction");
  });
});
