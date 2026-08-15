import { describe, expect, it } from "vitest";

import { CATEGORIES } from "@/lib/categories";
import { applyGameRevisions, GAME_REVISIONS, SCORE_ORDER_SEEDS } from "@/lib/game-revisions";
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

  it("points heardle at Heardle Unlimited", () => {
    expect(GAME_REVISIONS.heardle).toMatchObject({
      name: "Heardle Unlimited",
      url: "https://www.heardle.info",
      scoreOrder: "lower",
    });
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

  it("is idempotent: a fully-revised library reports no changes", () => {
    const games = [makeGame("heardle")];
    const once = applyGameRevisions(games);
    const twice = applyGameRevisions(once.games);
    expect(twice.changed).toEqual([]);
    expect(twice.games[0]).toBe(once.games[0]);
  });

  it("applies the v1 category moves for devices that never ran them", () => {
    const { games } = applyGameRevisions([makeGame("sudoku", { category: "Puzzles" })]);
    expect(games[0].category).toBe("Logic & Deduction");
  });
});
