import "server-only";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { dateOnly, localDateKey, monthKey, startOfLocalDay, weekRange } from "./dates";
import { METRICS } from "./goals";
import { DEFAULT_SKILLS } from "./skills";
import { categoryForType } from "./labels";
import { syncAchievements } from "./metrics";
import type { Prisma, TaskPriority, TaskStatus, TaskType } from "@/generated/prisma/client";

// "Try demo": every visitor gets a brand-new, isolated account with fictional data.
// Nothing here touches real users — all records belong to the new demo user.

const DEMO_TTL_HOURS = 24;
const MAX_DEMOS_PER_HOUR = 60;

const DAY = 24 * 60 * 60 * 1000;

/** Local (São Paulo) time `daysAgo` days ago at hh:mm. */
function at(daysAgo: number, hh: number, mm = 0) {
  const key = localDateKey(new Date(Date.now() - daysAgo * DAY));
  const [y, m, d] = key.split("-").map(Number);
  return new Date(startOfLocalDay(y, m, d).getTime() + (hh * 60 + mm) * 60000);
}

/** Value for DATE columns, `daysAgo` days ago. */
function day(daysAgo: number) {
  return dateOnly(localDateKey(new Date(Date.now() - daysAgo * DAY)));
}

/** Small deterministic pseudo-random generator, so the demo looks the same every time. */
function rng(seed: number) {
  return () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
}

export async function removeExpiredDemos() {
  await db.user.deleteMany({
    where: { isDemo: true, createdAt: { lt: new Date(Date.now() - DEMO_TTL_HOURS * 60 * 60 * 1000) } },
  });
}

export async function demoCapacityReached() {
  const recent = await db.user.count({ where: { isDemo: true, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } } });
  return recent >= MAX_DEMOS_PER_HOUR;
}

export async function createDemoWorkspace() {
  const random = rng(42);
  const suffix = randomBytes(6).toString("hex");

  const user = await db.user.create({
    data: {
      name: "Demo Developer",
      email: `demo-${suffix}@demo.lfworkspace.dev`,
      // Random password nobody knows: demo accounts are only reachable through "Try demo"
      passwordHash: await bcrypt.hash(randomBytes(24).toString("hex"), 4),
      title: "Full Stack Developer · Founder",
      companyName: "Demo Studio",
      isDemo: true,
    },
  });
  const userId = user.id;

  // ── Goals & skills ──
  await db.goal.createMany({
    data: METRICS.map((m) => ({
      userId,
      period: monthKey(),
      metric: m.key,
      target: m.key === "employment_income_usd" ? 2000 : m.key === "business_revenue_brl" ? 6000 : m.defaultTarget,
    })),
  });

  const skills = await db.skill.createManyAndReturn({
    data: DEFAULT_SKILLS.map((name, position) => ({ userId, name, position })),
  });
  const skill = (name: string) => skills.find((s) => s.name === name)!.id;
  await db.skillEvidence.createMany({
    data: [
      { skillId: skill("Frontend"), title: "Built the client portal dashboard with React Server Components", points: 20, date: day(20) },
      { skillId: skill("Frontend"), title: "Accessible checkout form with validation", points: 10, date: day(9) },
      { skillId: skill("Frontend"), title: "Responsive landing page for Bloom Café", points: 10, date: day(30) },
      { skillId: skill("Backend"), title: "JWT authentication with httpOnly cookies", points: 20, date: day(18) },
      { skillId: skill("Backend"), title: "Webhook handler for payment confirmations", points: 10, date: day(6) },
      { skillId: skill("APIs"), title: "Integrated Stripe test-mode payments", points: 10, date: day(8) },
      { skillId: skill("APIs"), title: "REST API for the clinic appointments", points: 20, date: day(25) },
      { skillId: skill("Databases"), title: "Modeled appointments schema with Prisma migrations", points: 20, date: day(24) },
      { skillId: skill("Testing"), title: "Unit tests for pricing rules (Vitest)", points: 10, date: day(5) },
      { skillId: skill("DevOps"), title: "Deployed to Vercel with a managed Postgres", points: 10, date: day(14) },
      { skillId: skill("English"), title: "Technical interview fully in English", points: 20, date: day(4) },
      { skillId: skill("English"), title: "Wrote project README and ADRs in English", points: 5, date: day(12) },
    ],
  });

  // ── Clients & projects ──
  const [bloom, northwind, atlas] = await db.client.createManyAndReturn({
    data: [
      { userId, name: "Bloom Café", segment: "Restaurant · Website", status: "ACTIVE", hourlyRate: 90, createdAt: at(60, 10) },
      { userId, name: "Northwind Clinic", segment: "Healthcare · Web app", status: "ACTIVE", hourlyRate: 110, createdAt: at(45, 10) },
      { userId, name: "Atlas Fitness", segment: "Gym · E-commerce", status: "DEVELOPMENT", country: "Portugal", createdAt: at(10, 10) },
    ],
  });

  const [portal, booking, store, workspace] = await db.project.createManyAndReturn({
    data: [
      { userId, clientId: northwind.id, name: "Clinic Portal", description: "Patient portal with appointments and records.", color: "#3B82A0" },
      { userId, clientId: bloom.id, name: "Bloom Website", description: "Website with online menu and reservations.", color: "#B0729A", status: "SHIPPED", shippedAt: at(16, 15) },
      { userId, clientId: atlas.id, name: "Atlas Store", description: "Online store for memberships and merch.", color: "#6E8B3D", status: "PLANNING" },
      { userId, name: "Internal Tools", description: "Own products and automations.", color: "#C0613D" },
    ],
  });

  // ── Sprints & tasks ──
  const thisMonday = weekRange().start;
  const daysSinceMonday = Math.floor((Date.now() - thisMonday.getTime()) / DAY);
  const [pastSprint, activeSprint] = await db.sprint.createManyAndReturn({
    data: [
      {
        userId,
        name: "Sprint 03 — Online reservations",
        goal: "Ship reservations for Bloom Café.",
        startDate: day(daysSinceMonday + 14),
        endDate: day(daysSinceMonday + 3),
        status: "COMPLETED",
      },
      {
        userId,
        name: "Sprint 04 — Clinic portal",
        goal: "Patients can book and cancel appointments online.",
        startDate: day(daysSinceMonday),
        endDate: day(daysSinceMonday - 11),
        status: "ACTIVE",
      },
    ],
  });

  type T = { title: string; type: TaskType; status: TaskStatus; priority?: TaskPriority; project: string; sprint?: string; doneDaysAgo?: number; estimate?: number; description?: string };
  const P = { portal: portal.id, booking: booking.id, store: store.id, workspace: workspace.id };
  const S = { past: pastSprint.id, active: activeSprint.id };
  const tasks: T[] = [
    // Past sprint — done
    { title: "Reservation form with date picker", type: "FRONTEND", status: "DONE", project: "booking", sprint: "past", doneDaysAgo: 19, estimate: 8 },
    { title: "Reservations API and email confirmation", type: "BACKEND", status: "DONE", project: "booking", sprint: "past", doneDaysAgo: 17, estimate: 10 },
    { title: "Admin list of reservations", type: "FULL_STACK", status: "DONE", project: "booking", sprint: "past", doneDaysAgo: 15, estimate: 8 },
    { title: "Deploy Bloom website to production", type: "DEVOPS", status: "DONE", project: "booking", sprint: "past", doneDaysAgo: 13, estimate: 2 },
    // Active sprint
    { title: "Appointment booking flow", type: "FULL_STACK", status: "DONE", priority: "HIGH", project: "portal", sprint: "active", doneDaysAgo: 3, estimate: 14 },
    { title: "Patient login with magic link", type: "BACKEND", status: "DONE", project: "portal", sprint: "active", doneDaysAgo: 1, estimate: 8 },
    {
      title: "Cancel appointment up to 24h before",
      type: "BACKEND",
      status: "IN_PROGRESS",
      priority: "HIGH",
      project: "portal",
      sprint: "active",
      estimate: 4,
      description: "Block cancellations within 24h and show a friendly message. Add tests for the rule.",
    },
    { title: "Appointment reminder emails", type: "BACKEND", status: "CODE_REVIEW", project: "portal", sprint: "active", estimate: 3 },
    { title: "Accessible calendar component", type: "FRONTEND", status: "TODO", priority: "HIGH", project: "portal", sprint: "active", estimate: 5 },
    { title: "E2E test: book and cancel an appointment", type: "TESTING", status: "TODO", project: "portal", sprint: "active", estimate: 3 },
    { title: "Send proposal to Atlas Fitness", type: "BUSINESS", status: "TODO", project: "store", sprint: "active" },
    { title: "Apply to 3 remote Full Stack roles", type: "CAREER", status: "IN_PROGRESS", project: "workspace", sprint: "active" },
    // Backlog
    { title: "Membership checkout with Stripe", type: "FULL_STACK", status: "BACKLOG", project: "store", estimate: 8 },
    { title: "Product catalog and filters", type: "FRONTEND", status: "BACKLOG", project: "store", estimate: 6 },
    { title: "Automate monthly invoices", type: "BACKEND", status: "BACKLOG", priority: "LOW", project: "workspace", estimate: 4 },
  ];

  const created = await db.task.createManyAndReturn({
    data: tasks.map((t, i) => ({
      userId,
      number: i + 1,
      title: t.title,
      description: t.description,
      type: t.type,
      category: categoryForType(t.type),
      status: t.status,
      priority: t.priority ?? "MEDIUM",
      estimate: t.estimate,
      projectId: P[t.project as keyof typeof P],
      sprintId: t.sprint ? S[t.sprint as keyof typeof S] : null,
      position: i,
      prUrl: t.status === "CODE_REVIEW" ? "https://github.com/example/clinic-portal/pull/42" : null,
      completedAt: t.doneDaysAgo !== undefined ? at(t.doneDaysAgo, 16, 30) : null,
      createdAt: at(30, 9),
    })),
  });

  // ── Time entries: each technical ticket gets roughly its estimate, on the weekdays before delivery ──
  const isWeekday = (daysAgo: number) => ![0, 6].includes(new Date(Date.now() - daysAgo * DAY).getUTCDay());
  const usedHours = new Map<number, number>(); // daysAgo → hours already booked that day
  const entries: { userId: string; taskId: string; projectId: string | null; startedAt: Date; endedAt: Date }[] = [];
  tasks.forEach((t, i) => {
    const task = created[i];
    if (task.category !== "DEVELOPMENT" || !t.estimate || t.status === "BACKLOG" || t.status === "TODO") return;
    // Finished tickets used ~90–130% of the estimate; open ones are about halfway
    let remaining = t.status === "DONE" ? t.estimate * (0.9 + random() * 0.4) : t.estimate * 0.5;
    let d = t.doneDaysAgo ?? 1;
    while (remaining > 0.25 && d < 40) {
      const used = usedHours.get(d) ?? 0;
      if (isWeekday(d) && used < 6) {
        const hours = Math.min(remaining, 2 + random(), 6 - used);
        // Morning block 9h–12h, afternoon from 13h30
        const startHour = used < 3 ? 9 + used : 13.5 + (used - 3);
        const startedAt = at(d, Math.floor(startHour), Math.round((startHour % 1) * 60));
        entries.push({ userId, taskId: task.id, projectId: task.projectId, startedAt, endedAt: new Date(startedAt.getTime() + hours * 3600000) });
        usedHours.set(d, used + hours);
        remaining -= hours;
      }
      d++;
    }
  });
  await db.timeEntry.createMany({ data: entries });

  await db.workday.createMany({
    data: [1, 2, 3, 4, 5, 6, 7, 8]
      .filter((d) => ![0, 6].includes(new Date(Date.now() - d * DAY).getUTCDay()))
      .map((d) => ({ userId, date: day(d), startedAt: at(d, 9), endedAt: at(d, 17, 10) })),
  });

  // ── CRM ──
  await db.lead.createMany({
    data: [
      { userId, company: "Sunrise Bakery", service: "Website", value: 2500, stage: "LEAD", source: "Instagram", createdAt: at(2, 11) },
      { userId, company: "Pet Care Plus", service: "Booking app", value: 6800, stage: "CONTACTED", source: "Referral", contactedAt: at(4, 15), nextFollowUp: day(-2), createdAt: at(6, 10) },
      { userId, company: "Studio Yoga Flow", service: "Website + SEO", value: 3200, stage: "MEETING", source: "Google", contactedAt: at(9, 10), nextFollowUp: day(0), createdAt: at(12, 10) },
      { userId, company: "Green Market", service: "E-commerce", value: 9500, stage: "PROPOSAL", source: "Referral", contactedAt: at(14, 10), proposalAt: at(5, 16), nextFollowUp: day(-1), createdAt: at(18, 10) },
      { userId, company: "Dental Smile", service: "Patient portal", value: 12000, stage: "NEGOTIATION", source: "LinkedIn", contactedAt: at(20, 10), proposalAt: at(8, 10), createdAt: at(25, 10) },
      { userId, company: "Atlas Fitness", service: "Online store", value: 8000, stage: "WON", source: "Referral", contactedAt: at(22, 10), proposalAt: at(15, 10), wonAt: at(10, 10), clientId: atlas.id, createdAt: at(28, 10) },
      { userId, company: "Old Town Books", service: "Website", value: 1800, stage: "LOST", source: "Instagram", contactedAt: at(30, 10), createdAt: at(33, 10) },
    ],
  });

  // ── Finance: 6 months of business revenue + a part-time international contract ──
  // Days since the 1st, so "this month" payments never fall into last month
  const daysIntoMonth = Number(localDateKey().slice(8)) - 1;
  const tx: Prisma.TransactionCreateManyInput[] = [];
  for (let m = 5; m >= 1; m--) {
    tx.push({ userId, stream: "BUSINESS", amount: 900, description: "Bloom Café — monthly maintenance", date: day(m * 30 + 5), recurring: true, clientId: bloom.id });
    tx.push({ userId, stream: "BUSINESS", amount: 2600 + Math.round(random() * 1800), description: "Northwind Clinic — development milestone", date: day(m * 30 + 12), clientId: northwind.id });
  }
  tx.push(
    { userId, stream: "BUSINESS", amount: 900, description: "Bloom Café — monthly maintenance", date: day(Math.min(3, daysIntoMonth)), recurring: true, clientId: bloom.id },
    { userId, stream: "BUSINESS", amount: 2400, description: "Atlas Fitness — 30% upfront", date: day(Math.min(2, daysIntoMonth)), clientId: atlas.id },
    { userId, stream: "BUSINESS", status: "EXPECTED", amount: 3500, description: "Northwind Clinic — Sprint 04 delivery", date: day(-10), clientId: northwind.id },
    { userId, stream: "EMPLOYMENT", currency: "USD", amount: 800, description: "Remote contract — part-time (US client)", date: day(Math.min(1, daysIntoMonth)) },
    { userId, stream: "EMPLOYMENT", currency: "USD", amount: 650, description: "Remote contract — part-time (US client)", date: day(32) },
  );
  await db.transaction.createMany({ data: tx });

  // ── International applications ──
  await db.jobApplication.createMany({
    data: [
      { userId, company: "Remote SaaS Co.", position: "Full Stack Developer", country: "USA", salary: 4000, technology: "React, Node, PostgreSQL", status: "TECHNICAL", furthest: "TECHNICAL", appliedAt: day(16), technicalAt: at(3, 14), followUpAt: day(-3) },
      { userId, company: "Lisbon Fintech", position: "Frontend Engineer", country: "Portugal", salary: 2800, technology: "React, TypeScript", status: "INTERVIEW", furthest: "INTERVIEW", appliedAt: day(10), interviewAt: at(-2, 11) },
      { userId, company: "Toronto Health", position: "Full Stack Developer", country: "Canada", salary: 3500, technology: "Next.js, Prisma", status: "SCREENING", furthest: "SCREENING", appliedAt: day(7) },
      { userId, company: "Berlin Mobility", position: "Junior Full Stack", country: "Germany", salary: 3000, technology: "Vue, Node", status: "APPLIED", furthest: "APPLIED", appliedAt: day(3), followUpAt: day(-4) },
      { userId, company: "Austin Startup", position: "Software Engineer", country: "USA", salary: 4500, technology: "TypeScript, AWS", status: "APPLIED", furthest: "APPLIED", appliedAt: day(1) },
      { userId, company: "Dublin Agency", position: "Web Developer", country: "Ireland", salary: 2600, technology: "React, Tailwind", status: "CLOSED", furthest: "TECHNICAL", appliedAt: day(28), technicalAt: at(18, 10) },
      { userId, company: "Amsterdam E-commerce", position: "Full Stack Developer", country: "Netherlands", salary: 3200, technology: "Node, React", status: "CLOSED", furthest: "SCREENING", appliedAt: day(25) },
      { userId, company: "NYC Media", position: "Full Stack Engineer", country: "USA", technology: "Next.js, GraphQL", status: "SAVED", furthest: "SAVED" },
    ],
  });

  // ── Activity feed ──
  await db.activityLog.createMany({
    data: [
      { userId, kind: "sprint", message: "👋 Welcome to the LF Workspace demo — all data here is fictional", createdAt: at(0, 0, 1) },
      { userId, kind: "finance", message: "💰 Received US$ 800 · Remote contract — part-time (US client)", createdAt: at(1, 18) },
      { userId, kind: "task", message: "LF-006 moved to Done", createdAt: at(1, 16, 30) },
      { userId, kind: "learning", message: "English ↑ Technical interview fully in English", createdAt: at(4, 17) },
      { userId, kind: "career", message: "Remote SaaS Co. moved to Technical", createdAt: at(3, 14) },
      { userId, kind: "task", message: "LF-008 moved to Code review", createdAt: at(2, 15) },
      { userId, kind: "business", message: "Lead Green Market moved to Proposal", createdAt: at(5, 16) },
      { userId, kind: "business", message: "🤝 Atlas Fitness is now a client", createdAt: at(10, 10) },
    ],
  });

  await syncAchievements(userId);
  return user;
}
