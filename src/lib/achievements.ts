// Achievements unlock automatically from real data — see syncAchievements() in metrics.ts.

export type AchievementStats = {
  applicationsSent: number;
  technicalStages: number;
  offers: number;
  ticketsDone: number;
  commits: number;
  usdEarned: number;
  internationalClients: number;
  bestBusinessMonthBRL: number;
  workdaysCompleted: number;
  trackedHours: number;
  sprintsCompleted: number;
  evidences: number;
};

export type AchievementDefinition = {
  key: string;
  emoji: string;
  title: string;
  description: string;
  check: (s: AchievementStats) => boolean;
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { key: "first_workday", emoji: "☀️", title: "First workday", description: "Closed your first full workday", check: (s) => s.workdaysCompleted >= 1 },
  { key: "first_ticket", emoji: "✅", title: "First ticket shipped", description: "Shipped a development ticket", check: (s) => s.ticketsDone >= 1 },
  { key: "ten_tickets", emoji: "🚀", title: "10 tickets shipped", description: "Completed 10 development tickets", check: (s) => s.ticketsDone >= 10 },
  { key: "ten_commits", emoji: "💻", title: "10 GitHub commits", description: "10 commits this week on GitHub", check: (s) => s.commits >= 10 },
  { key: "ten_hours", emoji: "⏱️", title: "10 focused hours", description: "Tracked 10 hours of real work", check: (s) => s.trackedHours >= 10 },
  { key: "first_evidence", emoji: "🧠", title: "Proof of skill", description: "Registered your first skill evidence", check: (s) => s.evidences >= 1 },
  { key: "first_sprint", emoji: "🏁", title: "Sprint completed", description: "Closed your first sprint", check: (s) => s.sprintsCompleted >= 1 },
  { key: "first_international_application", emoji: "🌎", title: "First international application", description: "Sent your first application abroad", check: (s) => s.applicationsSent >= 1 },
  { key: "first_technical_interview", emoji: "🎧", title: "First technical interview", description: "Reached a technical stage", check: (s) => s.technicalStages >= 1 },
  { key: "first_usd", emoji: "💵", title: "First US$ earned", description: "Received your first payment in dollars", check: (s) => s.usdEarned > 0 },
  { key: "first_international_client", emoji: "🌍", title: "First international client", description: "Closed a client outside Brazil", check: (s) => s.internationalClients >= 1 },
  { key: "five_k_month", emoji: "📈", title: "R$ 5k business month", description: "R$ 5.000 received in a single month", check: (s) => s.bestBusinessMonthBRL >= 5000 },
  { key: "first_offer", emoji: "🎉", title: "First job offer", description: "Received an international offer", check: (s) => s.offers >= 1 },
];

export function unlockedKeys(stats: AchievementStats) {
  return ACHIEVEMENTS.filter((a) => a.check(stats)).map((a) => a.key);
}
