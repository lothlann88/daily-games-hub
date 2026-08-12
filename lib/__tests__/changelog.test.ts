import { describe, expect, it } from "vitest";

import {
  APP_VERSION,
  CHANGELOG,
  compareVersions,
  unseenReleases,
} from "@/lib/changelog";

describe("compareVersions", () => {
  it("orders numerically per segment", () => {
    expect(compareVersions("1.2.0", "1.1.9")).toBeGreaterThan(0);
    expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
    expect(compareVersions("1.0.0", "2.0.0")).toBeLessThan(0);
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  });

  it("treats missing segments as zero", () => {
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
    expect(compareVersions("1.2.1", "1.2")).toBeGreaterThan(0);
  });
});

describe("unseenReleases", () => {
  it("returns nothing on a first visit (null last-seen)", () => {
    expect(unseenReleases(null)).toEqual([]);
  });

  it("returns releases newer than the last seen version", () => {
    const unseen = unseenReleases("1.0.0");
    expect(unseen.length).toBeGreaterThan(0);
    for (const release of unseen) {
      expect(compareVersions(release.version, "1.0.0")).toBeGreaterThan(0);
    }
  });

  it("returns nothing once the current version has been seen", () => {
    expect(unseenReleases(APP_VERSION)).toEqual([]);
  });
});

describe("CHANGELOG invariants", () => {
  it("derives APP_VERSION from the newest entry", () => {
    expect(APP_VERSION).toBe(CHANGELOG[0].version);
  });

  it("is sorted newest first with no duplicate versions", () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(
        compareVersions(CHANGELOG[i - 1].version, CHANGELOG[i].version)
      ).toBeGreaterThan(0);
    }
  });

  it("uses ISO dates and non-empty entries throughout", () => {
    for (const release of CHANGELOG) {
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(release.entries.length).toBeGreaterThan(0);
      for (const entry of release.entries) {
        expect(entry.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
