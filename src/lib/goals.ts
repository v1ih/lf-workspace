// Monthly goals. Targets live in the database (Goal table);
// the actual values are always computed from real records — never typed by hand.

export type MetricKey =
  | "applications"
  | "technical_interviews"
  | "international_offer"
  | "dev_hours"
  | "tickets_done"
  | "projects_shipped"
  | "new_leads"
  | "proposals"
  | "new_clients"
  | "employment_income_usd"
  | "business_revenue_brl";

export type GoalArea = "CAREER" | "DEVELOPMENT" | "BUSINESS" | "FINANCE";

export type MetricDefinition = {
  key: MetricKey;
  area: GoalArea;
  label: string;
  unit: "count" | "hours" | "usd" | "brl";
  defaultTarget: number;
};

export const METRICS: MetricDefinition[] = [
  { key: "applications", area: "CAREER", label: "Applications", unit: "count", defaultTarget: 30 },
  { key: "technical_interviews", area: "CAREER", label: "Technical interviews", unit: "count", defaultTarget: 2 },
  { key: "international_offer", area: "CAREER", label: "International offer", unit: "count", defaultTarget: 1 },
  { key: "dev_hours", area: "DEVELOPMENT", label: "Focused development", unit: "hours", defaultTarget: 60 },
  { key: "tickets_done", area: "DEVELOPMENT", label: "Dev tickets completed", unit: "count", defaultTarget: 20 },
  { key: "projects_shipped", area: "DEVELOPMENT", label: "Projects shipped", unit: "count", defaultTarget: 1 },
  { key: "new_leads", area: "BUSINESS", label: "New leads", unit: "count", defaultTarget: 15 },
  { key: "proposals", area: "BUSINESS", label: "Proposals", unit: "count", defaultTarget: 5 },
  { key: "new_clients", area: "BUSINESS", label: "New clients", unit: "count", defaultTarget: 2 },
  { key: "employment_income_usd", area: "FINANCE", label: "International Developer", unit: "usd", defaultTarget: 1500 },
  { key: "business_revenue_brl", area: "FINANCE", label: "Lavínia Ferraz | Soluções Digitais", unit: "brl", defaultTarget: 4000 },
];

/** Weekly rhythm shown on the dashboard cards. */
export const WEEKLY_TARGETS = { hours: 30, applications: 10, leads: 5 };

export const AREAS: { key: GoalArea; label: string }[] = [
  { key: "CAREER", label: "Career" },
  { key: "DEVELOPMENT", label: "Development" },
  { key: "BUSINESS", label: "Business" },
  { key: "FINANCE", label: "Finance" },
];

export type MetricValues = Record<MetricKey, number>;

export type GoalProgress = MetricDefinition & { target: number; actual: number; percent: number };

export function buildGoalProgress(
  actuals: MetricValues,
  targets: Partial<Record<string, number>>,
): GoalProgress[] {
  return METRICS.map((metric) => {
    const target = targets[metric.key] ?? metric.defaultTarget;
    const actual = actuals[metric.key] ?? 0;
    const pct = target > 0 ? Math.min(100, Math.round((actual / target) * 100)) : 0;
    return { ...metric, target, actual, percent: pct };
  });
}

export function formatMetric(value: number, unit: MetricDefinition["unit"]) {
  switch (unit) {
    case "hours":
      return `${Math.round(value * 10) / 10}h`;
    case "usd":
      return `US$ ${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
    case "brl":
      return `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
    default:
      return String(value);
  }
}
