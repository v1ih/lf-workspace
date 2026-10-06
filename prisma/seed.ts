// Seeds the first user and the real starting point of LF Workspace.
// Run with: npm run db:seed  (safe to run again — it skips existing data)
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type TaskPriority, type TaskStatus, type TaskType } from "../src/generated/prisma/client";
import { METRICS } from "../src/lib/goals";
import { DEFAULT_SKILLS } from "../src/lib/skills";
import { monthKey } from "../src/lib/dates";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

type SeedTask = { title: string; type: TaskType; priority?: TaskPriority; project: string; description?: string };

// Sprint 00 — what was built on Onboarding Day (Oct 6, 2026)
const SPRINT_00: SeedTask[] = [
  { title: "Architecture — define stack and project structure", type: "DOCS", project: "LF Workspace" },
  { title: "Authentication — login and user session", type: "BACKEND", project: "LF Workspace" },
  { title: "Dashboard — main overview with real metrics", type: "FRONTEND", project: "LF Workspace" },
  { title: "Task Management — CRUD and Kanban board", type: "FULL_STACK", project: "LF Workspace" },
  { title: "Time Tracking — start/stop timer", type: "FULL_STACK", project: "LF Workspace" },
  { title: "Projects — projects and clients", type: "FULL_STACK", project: "LF Workspace" },
  { title: "CRM — leads and sales pipeline", type: "FULL_STACK", project: "LF Workspace" },
  { title: "Job Tracker — international applications", type: "FULL_STACK", project: "LF Workspace" },
  { title: "Finance — revenue and monthly goals", type: "FULL_STACK", project: "LF Workspace" },
  { title: "Analytics — charts and reports", type: "FRONTEND", project: "LF Workspace" },
];

// Sprint 01 — the first real week of work
const SPRINT_01: SeedTask[] = [
  {
    title: "Improve Vet-Pass access validation",
    type: "BACKEND",
    priority: "HIGH",
    project: "PetHelp",
    description: "Validate the Vet-Pass code on the server and return clear errors for invalid codes.",
  },
  {
    title: "Handle expired veterinarian access",
    type: "FULL_STACK",
    priority: "HIGH",
    project: "PetHelp",
    description: "When a vet's temporary access expires, block the request and show a friendly message.",
  },
  {
    title: "Create automated tests for PetHelp access rules",
    type: "TESTING",
    project: "PetHelp",
  },
  {
    title: "Deploy LF Workspace to Vercel with a managed Postgres",
    type: "DEVOPS",
    project: "LF Workspace",
    description: "Create a Neon/Supabase database, set DATABASE_URL and SESSION_SECRET on Vercel, run migrations.",
  },
  {
    title: "Add a Playwright end-to-end test for login and the Kanban",
    type: "TESTING",
    project: "LF Workspace",
  },
  {
    title: "Update CV and LinkedIn in English featuring LF Workspace",
    type: "CAREER",
    priority: "HIGH",
    project: "LF Workspace",
  },
  { title: "Send 2 international applications", type: "CAREER", project: "LF Workspace" },
  { title: "Contact 1 potential client", type: "BUSINESS", project: "LF Workspace" },
];

async function main() {
  const email = (process.env.SEED_EMAIL ?? "lavinia@lfworkspace.dev").toLowerCase();
  // Checked first so later deploys (which also run the seed) don't need the password
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists — nothing to do.`);
    return;
  }

  const password = process.env.SEED_PASSWORD;
  if (!password) throw new Error("Set SEED_PASSWORD in .env before seeding");

  const user = await db.user.create({
    data: {
      name: process.env.SEED_NAME ?? "Lavínia Ferraz",
      email,
      passwordHash: await bcrypt.hash(password, 12),
      githubUsername: "v1ih",
    },
  });

  // October goals agreed on Onboarding Day
  const period = monthKey();
  await db.goal.createMany({
    data: METRICS.map((m) => ({ userId: user.id, period, metric: m.key, target: m.defaultTarget })),
  });

  await db.skill.createMany({
    data: DEFAULT_SKILLS.map((name, position) => ({ userId: user.id, name, position })),
  });

  const maryBless = await db.client.create({
    data: { userId: user.id, name: "Mary Bless", segment: "E-commerce · Nuvemshop", status: "ACTIVE" },
  });
  const petHelp = await db.client.create({
    data: { userId: user.id, name: "PetHelp", segment: "Internal Product", status: "DEVELOPMENT" },
  });

  const projects = {
    "LF Workspace": await db.project.create({
      data: {
        userId: user.id,
        name: "LF Workspace",
        description: "Internal system to run work, business and career — Next.js, TypeScript, PostgreSQL.",
        status: "ACTIVE",
        color: "#C0613D",
      },
    }),
    PetHelp: await db.project.create({
      data: {
        userId: user.id,
        clientId: petHelp.id,
        name: "PetHelp",
        description: "Pet health platform for tutors, clinics and veterinarians.",
        status: "ACTIVE",
        color: "#3B82A0",
      },
    }),
    "Mary Bless Store": await db.project.create({
      data: {
        userId: user.id,
        clientId: maryBless.id,
        name: "Mary Bless Store",
        description: "Nuvemshop store: catalog, categories and product pages.",
        status: "ACTIVE",
        color: "#B0729A",
      },
    }),
  };

  const sprint00 = await db.sprint.create({
    data: {
      userId: user.id,
      name: "Sprint 00 — Onboarding",
      goal: "Build the foundation of LF Workspace.",
      startDate: new Date("2026-10-06"),
      endDate: new Date("2026-10-06"),
      status: "COMPLETED",
    },
  });
  const sprint01 = await db.sprint.create({
    data: {
      userId: user.id,
      name: "Sprint 01 — Building the Foundation",
      goal: "Start operating as Full Stack Developer + Founder.",
      startDate: new Date("2026-10-07"),
      endDate: new Date("2026-10-10"),
      status: "ACTIVE",
    },
  });

  let number = 1;
  const createTasks = async (list: SeedTask[], sprintId: string, status: TaskStatus) => {
    for (const [index, t] of list.entries()) {
      await db.task.create({
        data: {
          userId: user.id,
          number: number++,
          title: t.title,
          description: t.description,
          type: t.type,
          priority: t.priority ?? "MEDIUM",
          projectId: projects[t.project as keyof typeof projects].id,
          sprintId,
          status,
          position: index,
          completedAt: status === "DONE" ? new Date() : null,
        },
      });
    }
  };
  await createTasks(SPRINT_00, sprint00.id, "DONE");
  await createTasks(SPRINT_01, sprint01.id, "TODO");

  await db.activityLog.create({
    data: { userId: user.id, kind: "sprint", message: "Onboarding Day: LF Workspace v0.1 is live 🚀" },
  });

  console.log(`Seeded ${email}. The password is SEED_PASSWORD in your .env file.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
