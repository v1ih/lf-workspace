import { describe, expect, it } from "vitest";
import { entrySeconds, formatClock, formatDuration, percent, taskCode } from "@/lib/utils";

describe("taskCode", () => {
  it("pads the ticket number", () => {
    expect(taskCode(1)).toBe("LF-001");
    expect(taskCode(42)).toBe("LF-042");
    expect(taskCode(1234)).toBe("LF-1234");
  });
});

describe("formatDuration", () => {
  it("formats hours and minutes like the End of Day report", () => {
    expect(formatDuration(3 * 3600 + 42 * 60)).toBe("3h42");
    expect(formatDuration(5 * 60)).toBe("5m");
    expect(formatDuration(-10)).toBe("0m");
  });
});

describe("formatClock", () => {
  it("formats a running timer", () => {
    expect(formatClock(3725)).toBe("01:02:05");
  });
});

describe("percent", () => {
  it("caps at 100 and handles a zero target", () => {
    expect(percent(5, 10)).toBe(50);
    expect(percent(20, 10)).toBe(100);
    expect(percent(1, 0)).toBe(0);
  });
});

describe("entrySeconds", () => {
  it("counts running entries until now", () => {
    const startedAt = new Date("2026-10-07T12:00:00Z");
    const now = new Date("2026-10-07T12:30:00Z");
    expect(entrySeconds({ startedAt, endedAt: null }, now)).toBe(1800);
    expect(entrySeconds({ startedAt, endedAt: new Date("2026-10-07T13:00:00Z") })).toBe(3600);
  });
});
