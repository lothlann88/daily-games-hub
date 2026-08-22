import { describe, expect, it } from "vitest";

import { parseExportData } from "@/lib/export-schema";

function makeValidPayload() {
  return {
    version: "2.0",
    exportDate: "2026-08-21T00:00:00.000Z",
    games: [
      {
        id: "wordle",
        name: "Wordle",
        url: "https://example.com",
        category: "Word Games",
        icon: "",
        dateAdded: 1_700_000_000_000,
        currentStreak: 3,
        longestStreak: 9,
        playHistory: [1_700_000_000_000],
        isFavorite: true,
        tags: ["Quick"],
      },
    ],
    scores: [
      {
        id: "s1",
        gameId: "wordle",
        result: "win",
        datePlayed: 1_700_000_000_000,
        score: 4,
      },
    ],
    userProfile: { id: "u1", name: "Alice" },
    preferences: { favoriteGameIds: ["wordle"] },
  };
}

describe("parseExportData", () => {
  it("accepts a valid payload and returns it", () => {
    const payload = makeValidPayload();
    const parsed = parseExportData(payload);
    expect(parsed.version).toBe("2.0");
    expect(parsed.games).toHaveLength(1);
    expect(parsed.scores[0].gameId).toBe("wordle");
  });

  it("accepts a payload with no userProfile or preferences", () => {
    const payload = makeValidPayload();
    payload.userProfile = null as never;
    payload.preferences = null as never;
    expect(() => parseExportData(payload)).not.toThrow();
  });

  it("preserves unknown fields written by a newer app version", () => {
    const payload = makeValidPayload();
    (payload as Record<string, unknown>).futureField = "keep me";
    const parsed = parseExportData(payload) as unknown as Record<string, unknown>;
    expect(parsed.futureField).toBe("keep me");
  });

  it("rejects a payload missing the games array", () => {
    const payload = makeValidPayload() as Record<string, unknown>;
    delete payload.games;
    expect(() => parseExportData(payload)).toThrow();
  });

  it("rejects a payload missing the scores array", () => {
    const payload = makeValidPayload() as Record<string, unknown>;
    delete payload.scores;
    expect(() => parseExportData(payload)).toThrow();
  });

  it("rejects a payload missing the version", () => {
    const payload = makeValidPayload() as Record<string, unknown>;
    delete payload.version;
    expect(() => parseExportData(payload)).toThrow();
  });

  it("rejects a malformed game item (missing required fields)", () => {
    const payload = makeValidPayload();
    payload.games = [{ id: "broken", name: "Broken" } as never];
    expect(() => parseExportData(payload)).toThrow();
  });

  it("rejects a game whose playHistory is the wrong type", () => {
    const payload = makeValidPayload();
    payload.games[0].playHistory = "nope" as never;
    expect(() => parseExportData(payload)).toThrow();
  });

  it("rejects a malformed score item (invalid result)", () => {
    const payload = makeValidPayload();
    payload.scores[0].result = "victory" as never;
    expect(() => parseExportData(payload)).toThrow();
  });

  it("rejects a non-object payload", () => {
    expect(() => parseExportData(null)).toThrow();
    expect(() => parseExportData("just a string")).toThrow();
  });
});
