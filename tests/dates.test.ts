import { describe, expect, it } from "vitest";
import { localDateKey, monthKey, startOfLocalDay, timezoneOffsetMinutes, todayRange, weekRange } from "@/lib/dates";

describe("timezone helpers (America/Sao_Paulo)", () => {
  it("knows São Paulo is UTC-3", () => {
    expect(timezoneOffsetMinutes(new Date("2026-10-06T12:00:00Z"))).toBe(-180);
  });

  it("uses the local calendar day, not UTC", () => {
    // 01:00 UTC on Oct 7 is still Oct 6 at 22:00 in São Paulo
    expect(localDateKey(new Date("2026-10-07T01:00:00Z"))).toBe("2026-10-06");
    expect(monthKey(new Date("2026-11-01T02:00:00Z"))).toBe("2026-10");
  });

  it("starts the local day at 03:00 UTC", () => {
    expect(startOfLocalDay(2026, 10, 6).toISOString()).toBe("2026-10-06T03:00:00.000Z");
  });

  it("builds today's range", () => {
    const { start, end } = todayRange(new Date("2026-10-06T20:00:00Z"));
    expect(start.toISOString()).toBe("2026-10-06T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-07T03:00:00.000Z");
  });

  it("weeks start on Monday", () => {
    // Tuesday, Oct 6 2026 → week starts Monday, Oct 5
    const { start, end } = weekRange(new Date("2026-10-06T20:00:00Z"));
    expect(start.toISOString()).toBe("2026-10-05T03:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-12T03:00:00.000Z");
  });

  it("handles Sunday as the last day of the week", () => {
    const { start } = weekRange(new Date("2026-10-11T15:00:00Z"));
    expect(start.toISOString()).toBe("2026-10-05T03:00:00.000Z");
  });
});
