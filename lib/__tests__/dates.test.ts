import { describe, expect, it } from "vitest";

import { addDays, DAY_MS, dayKey, daysBetween, startOfDay, uniqueDays } from "@/lib/dates";

// Fixtures are built with local Date constructors and navigated with addDays,
// never with raw ± DAY_MS, so the suite behaves the same in any timezone.
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).getTime();

describe("startOfDay", () => {
  it("strips the time of day", () => {
    const noon = at(2026, 7, 20, 12);
    const midnight = new Date(2026, 7, 20, 0, 0, 0, 0).getTime();
    expect(startOfDay(noon)).toBe(midnight);
  });

  it("is idempotent", () => {
    const once = startOfDay(at(2026, 7, 20, 23));
    expect(startOfDay(once)).toBe(once);
  });
});

describe("dayKey", () => {
  it("zero-pads single-digit months and days", () => {
    expect(dayKey(at(2026, 0, 5))).toBe("2026-01-05");
  });

  it("uses local date parts, not UTC", () => {
    expect(dayKey(at(2026, 11, 31, 23))).toBe("2026-12-31");
  });
});

describe("addDays", () => {
  it("crosses a month end", () => {
    expect(dayKey(addDays(at(2026, 7, 31), 1))).toBe("2026-09-01");
  });

  it("crosses a year end", () => {
    expect(dayKey(addDays(at(2026, 11, 31), 1))).toBe("2027-01-01");
  });

  it("goes backwards", () => {
    expect(dayKey(addDays(at(2026, 2, 1), -1))).toBe("2026-02-28");
  });

  it("round-trips", () => {
    const day = at(2026, 7, 20);
    expect(addDays(addDays(day, -1), 1)).toBe(startOfDay(day));
  });
});

describe("daysBetween", () => {
  it("is zero for the same day", () => {
    expect(daysBetween(at(2026, 7, 20, 1), at(2026, 7, 20, 23))).toBe(0);
  });

  it("is negative when going backwards", () => {
    expect(daysBetween(at(2026, 7, 20), at(2026, 7, 19))).toBe(-1);
  });

  // The regression test for the old Math.floor arithmetic: clock-change days
  // are 23 or 25 hours long, and 23/24 floored to 0 silently broke streaks.
  it("counts exactly one day between consecutive days, all year round", () => {
    let day = at(2026, 0, 1);
    for (let i = 0; i < 365; i++) {
      const next = addDays(day, 1);
      expect(daysBetween(day, next), `failed at ${dayKey(day)} -> ${dayKey(next)}`).toBe(1);
      day = next;
    }
  });

  it("spans a whole week", () => {
    const start = at(2026, 7, 1);
    expect(daysBetween(start, addDays(start, 7))).toBe(7);
  });
});

describe("uniqueDays", () => {
  it("dedupes several plays on one day and sorts ascending", () => {
    const day = at(2026, 7, 20);
    const next = addDays(day, 1);
    const result = uniqueDays([
      next,
      at(2026, 7, 20, 9),
      at(2026, 7, 20, 21),
      day,
    ]);
    expect(result).toEqual([startOfDay(day), startOfDay(next)]);
  });

  it("returns an empty array for no timestamps", () => {
    expect(uniqueDays([])).toEqual([]);
  });
});

describe("DAY_MS", () => {
  it("is 24 hours", () => {
    expect(DAY_MS).toBe(86_400_000);
  });
});
