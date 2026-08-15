import { describe, expect, it } from "vitest";

import { beatsScore, compareScoresBestFirst } from "@/lib/score-order";

describe("beatsScore", () => {
  it("prefers bigger numbers for higher (and by default)", () => {
    expect(beatsScore(5, 3, "higher")).toBe(true);
    expect(beatsScore(3, 5, "higher")).toBe(false);
    expect(beatsScore(5, 3, undefined)).toBe(true);
    expect(beatsScore(5, 3, "none")).toBe(true);
  });

  it("prefers smaller numbers for lower", () => {
    expect(beatsScore(2, 4, "lower")).toBe(true);
    expect(beatsScore(4, 2, "lower")).toBe(false);
  });

  it("never lets a missing score beat a real one, in either direction", () => {
    expect(beatsScore(null, 3, "lower")).toBe(false);
    expect(beatsScore(undefined, 3, "higher")).toBe(false);
    expect(beatsScore(3, null, "lower")).toBe(true);
  });

  it("does not treat an equal score as better", () => {
    expect(beatsScore(3, 3, "higher")).toBe(false);
    expect(beatsScore(3, 3, "lower")).toBe(false);
  });
});

describe("compareScoresBestFirst", () => {
  it("sorts best first per direction with missing scores last", () => {
    const scores = [4, null, 2, 7];
    expect([...scores].sort((a, b) => compareScoresBestFirst(a, b, "higher"))).toEqual([
      7, 4, 2, null,
    ]);
    expect([...scores].sort((a, b) => compareScoresBestFirst(a, b, "lower"))).toEqual([
      2, 4, 7, null,
    ]);
  });

  it("treats -Infinity sentinels as missing", () => {
    expect(compareScoresBestFirst(-Infinity, 3, "lower")).toBeGreaterThan(0);
    expect(compareScoresBestFirst(3, -Infinity, "higher")).toBeLessThan(0);
  });
});
