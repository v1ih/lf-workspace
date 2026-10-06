import { describe, expect, it } from "vitest";
import { buildGoalProgress, formatMetric, METRICS, type MetricValues } from "@/lib/goals";
import { unlockedKeys, type AchievementStats } from "@/lib/achievements";
import { skillBar, skillLevel } from "@/lib/skills";

const zeroMetrics = Object.fromEntries(METRICS.map((m) => [m.key, 0])) as MetricValues;

const zeroStats: AchievementStats = {
  applicationsSent: 0,
  technicalStages: 0,
  offers: 0,
  ticketsDone: 0,
  commits: 0,
  usdEarned: 0,
  internationalClients: 0,
  bestBusinessMonthBRL: 0,
  workdaysCompleted: 0,
  trackedHours: 0,
  sprintsCompleted: 0,
  evidences: 0,
};

describe("goals", () => {
  it("uses stored targets and falls back to defaults", () => {
    const progress = buildGoalProgress({ ...zeroMetrics, employment_income_usd: 750 }, { employment_income_usd: 1500 });
    const usd = progress.find((p) => p.key === "employment_income_usd")!;
    expect(usd.percent).toBe(50);
    const apps = progress.find((p) => p.key === "applications")!;
    expect(apps.target).toBe(30);
  });

  it("formats each unit", () => {
    expect(formatMetric(12.34, "hours")).toBe("12.3h");
    expect(formatMetric(1500, "usd")).toBe("US$ 1,500");
  });
});

describe("achievements", () => {
  it("unlocks nothing without real data", () => {
    expect(unlockedKeys(zeroStats)).toEqual([]);
  });

  it("unlocks from real numbers only", () => {
    const keys = unlockedKeys({ ...zeroStats, applicationsSent: 1, ticketsDone: 10, bestBusinessMonthBRL: 4999 });
    expect(keys).toContain("first_international_application");
    expect(keys).toContain("ten_tickets");
    expect(keys).not.toContain("five_k_month");
  });
});

describe("skills", () => {
  it("levels up by evidence and caps at 100", () => {
    expect(skillLevel([{ points: 10 }, { points: 20 }])).toBe(30);
    expect(skillLevel(Array(20).fill({ points: 10 }))).toBe(100);
  });

  it("draws the skill bar", () => {
    expect(skillBar(60)).toBe("██████░░░░");
    expect(skillBar(0)).toBe("░░░░░░░░░░");
  });
});

describe("task categories", () => {
  it("derives a default category from the ticket type", async () => {
    const { categoryForType } = await import("@/lib/labels");
    expect(categoryForType("BACKEND")).toBe("DEVELOPMENT");
    expect(categoryForType("TESTING")).toBe("DEVELOPMENT");
    expect(categoryForType("BUSINESS")).toBe("BUSINESS");
    expect(categoryForType("CAREER")).toBe("CAREER");
  });
});
