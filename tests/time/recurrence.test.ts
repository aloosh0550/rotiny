import { describe, expect, it } from "vitest";
import { expandOccurrences, isDueOnDate } from "@/lib/time/recurrence";
import { dateKey } from "@/lib/time/dateUtils";

describe("expandOccurrences — no recurrence", () => {
  it("returns the single event when it overlaps the range", () => {
    const start = new Date(2026, 7, 27, 10, 0);
    const end = new Date(2026, 7, 27, 11, 0);
    const result = expandOccurrences(null, start, end, new Date(2026, 7, 27), new Date(2026, 7, 28));
    expect(result).toHaveLength(1);
    expect(result[0].start).toEqual(start);
  });

  it("returns nothing when the event is outside the range", () => {
    const start = new Date(2026, 7, 20, 10, 0);
    const end = new Date(2026, 7, 20, 11, 0);
    const result = expandOccurrences(null, start, end, new Date(2026, 7, 27), new Date(2026, 7, 28));
    expect(result).toHaveLength(0);
  });
});

describe("expandOccurrences — daily", () => {
  it("produces one occurrence per day across a week-long range", () => {
    const anchor = new Date(2026, 7, 1, 9, 0);
    const rule = { frequency: "daily" as const, interval: 1 };
    const occ = expandOccurrences(rule, anchor, anchor, new Date(2026, 7, 10), new Date(2026, 7, 17));
    expect(occ).toHaveLength(7);
  });

  it("respects interval > 1 (every other day)", () => {
    const anchor = new Date(2026, 7, 1, 9, 0);
    const rule = { frequency: "daily" as const, interval: 2 };
    const occ = expandOccurrences(rule, anchor, anchor, new Date(2026, 7, 1), new Date(2026, 7, 8));
    expect(occ.map((o) => o.start.getDate())).toEqual([1, 3, 5, 7]);
  });
});

describe("expandOccurrences — weekly", () => {
  it("produces occurrences only on the specified weekday", () => {
    // Anchor on a Saturday; byWeekday targets Thursday (4).
    const anchor = new Date(2026, 7, 1, 17, 30); // Aug 1 2026 is a Saturday
    const rule = { frequency: "weekly" as const, interval: 1, byWeekday: [4] };
    const occ = expandOccurrences(rule, anchor, anchor, new Date(2026, 7, 1), new Date(2026, 7, 29));
    for (const o of occ) expect(o.start.getDay()).toBe(4);
    expect(occ.length).toBeGreaterThanOrEqual(3);
  });
});

describe("isDueOnDate — regression: zero-duration occurrence landing exactly on rangeStart", () => {
  it("a daily habit anchored weeks ago is due today", () => {
    const today = new Date(2026, 7, 26);
    const anchor = new Date(2026, 7, 12); // two weeks earlier, same time-of-day (midnight)
    const rule = { frequency: "daily" as const, interval: 1 };
    expect(isDueOnDate(rule, anchor, today)).toBe(true);
  });

  it("a weekly habit is due exactly on its matching weekday and not on others", () => {
    const anchor = new Date(2026, 7, 1); // Saturday
    const rule = { frequency: "weekly" as const, interval: 1, byWeekday: [4] }; // Thursday
    const thursday = new Date(2026, 7, 27);
    const friday = new Date(2026, 7, 28);
    expect(isDueOnDate(rule, anchor, thursday)).toBe(true);
    expect(isDueOnDate(rule, anchor, friday)).toBe(false);
  });

  it("respects dateKey boundaries consistently", () => {
    const anchor = new Date(2026, 7, 1);
    const rule = { frequency: "daily" as const, interval: 1 };
    const day = new Date(2026, 7, 15);
    expect(dateKey(day)).toBe("2026-08-15");
    expect(isDueOnDate(rule, anchor, day)).toBe(true);
  });
});
