// The Skill Matrix grows by evidence, not by hours studied.

export const EVIDENCE_SIZES = [
  { points: 5, label: "Practiced", hint: "Used it in a real task" },
  { points: 10, label: "Shipped", hint: "Delivered a feature with it" },
  { points: 20, label: "Owned", hint: "Shipped, tested and deployed end-to-end" },
] as const;

export const DEFAULT_SKILLS = ["Frontend", "Backend", "APIs", "Databases", "Testing", "DevOps", "English"];

export function skillLevel(evidences: { points: number }[]) {
  const total = evidences.reduce((sum, e) => sum + e.points, 0);
  return Math.min(100, total);
}

/** 60 → "██████░░░░" */
export function skillBar(level: number, size = 10) {
  const filled = Math.round((Math.min(100, Math.max(0, level)) / 100) * size);
  return "█".repeat(filled) + "░".repeat(size - filled);
}
