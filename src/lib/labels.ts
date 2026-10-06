// Display labels for database enums. Kept as plain objects so they
// can be imported from both Server and Client Components.

export type Tone = "neutral" | "accent" | "blue" | "green" | "amber" | "red" | "violet";

export const TASK_STATUSES = [
  { value: "BACKLOG", label: "Backlog" },
  { value: "TODO", label: "To do" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "CODE_REVIEW", label: "Code review" },
  { value: "DONE", label: "Done" },
] as const;

export const TASK_PRIORITIES: Record<string, { label: string; tone: Tone }> = {
  LOW: { label: "Low", tone: "neutral" },
  MEDIUM: { label: "Medium", tone: "blue" },
  HIGH: { label: "High priority", tone: "amber" },
  URGENT: { label: "Urgent", tone: "red" },
};

export const TASK_TYPES: Record<string, string> = {
  FRONTEND: "Frontend",
  BACKEND: "Backend",
  FULL_STACK: "Full Stack",
  TESTING: "Testing",
  DEVOPS: "DevOps",
  DOCS: "Docs",
  BUSINESS: "Business",
  CAREER: "Career",
};

export const PROJECT_STATUSES: Record<string, { label: string; tone: Tone }> = {
  PLANNING: { label: "Planning", tone: "neutral" },
  ACTIVE: { label: "Active", tone: "green" },
  ON_HOLD: { label: "On hold", tone: "amber" },
  SHIPPED: { label: "Shipped", tone: "violet" },
  ARCHIVED: { label: "Archived", tone: "neutral" },
};

export const CLIENT_STATUSES: Record<string, { label: string; tone: Tone }> = {
  ACTIVE: { label: "Active", tone: "green" },
  DEVELOPMENT: { label: "Development", tone: "blue" },
  PAUSED: { label: "Paused", tone: "amber" },
  CLOSED: { label: "Closed", tone: "neutral" },
};

export const LEAD_STAGES = [
  { value: "LEAD", label: "Lead" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "MEETING", label: "Meeting" },
  { value: "PROPOSAL", label: "Proposal" },
  { value: "NEGOTIATION", label: "Negotiation" },
  { value: "WON", label: "Won" },
  { value: "LOST", label: "Lost" },
] as const;

export const APPLICATION_STATUSES = [
  { value: "SAVED", label: "Saved" },
  { value: "APPLIED", label: "Applied" },
  { value: "SCREENING", label: "Screening" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "OFFER", label: "Offer" },
  { value: "CLOSED", label: "Closed" },
] as const;

export const SPRINT_STATUSES: Record<string, { label: string; tone: Tone }> = {
  PLANNED: { label: "Planned", tone: "neutral" },
  ACTIVE: { label: "Active", tone: "accent" },
  COMPLETED: { label: "Completed", tone: "green" },
};

export function labelOf(list: readonly { value: string; label: string }[], value: string) {
  return list.find((item) => item.value === value)?.label ?? value;
}

export const TASK_CATEGORIES = [
  { value: "DEVELOPMENT", label: "Development", tone: "blue" },
  { value: "BUSINESS", label: "Business", tone: "accent" },
  { value: "CAREER", label: "Career", tone: "green" },
  { value: "ADMINISTRATIVE", label: "Administrative", tone: "neutral" },
] as const satisfies readonly { value: string; label: string; tone: Tone }[];

export type TaskCategoryValue = (typeof TASK_CATEGORIES)[number]["value"];

/** Default category for a ticket type — can be changed per ticket. */
export function categoryForType(type: string): TaskCategoryValue {
  if (type === "BUSINESS") return "BUSINESS";
  if (type === "CAREER") return "CAREER";
  return "DEVELOPMENT";
}
