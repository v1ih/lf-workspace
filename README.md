# LF Workspace

> Internal operating system for **Lavínia Ferraz | Soluções Digitais** — one place to run development work, the business and an international career.

LF Workspace is a full-stack web app where every number is real: tickets, tracked hours, leads, revenue and job applications all come from records, never from typed-in totals. *The aesthetics represent the life you want; the indicators represent what you actually did.*

## Try it

Open **https://lf-workspace.vercel.app** and click **Try the demo**. You get your own private workspace with fictional data — drag tickets, start the timer, move leads in the CRM. It is deleted after 24 hours and never touches real data.

## Features

| Area | What it does |
| --- | --- |
| **Dashboard** | Today's focus, sprint progress, hours this week, commits (GitHub API), applications, leads, pipeline, revenue vs. goals, weekly hours chart, application funnel, activity feed |
| **Today** | Morning *Daily* (yesterday, sprint goal, priority, next up, career and founder tasks) and *End of Day* report — both copyable as text |
| **My Work** | Kanban `Backlog → To do → In progress → Code review → Done` with drag & drop, task editor, *Start working* timer and *Submit for review* with PR link. Tickets are numbered `LF-001`, `LF-002`… |
| **Sprints** | Short cycles with a goal; only one active sprint at a time |
| **Projects / Clients** | Projects linked to clients; client page with hours, payments, receivables and **effective hourly rate** |
| **Time Tracking** | Start/stop timer from anywhere, manual entries, daily grouping |
| **CRM** | Pipeline `Lead → Contacted → Meeting → Proposal → Negotiation → Won`; winning a lead creates the client automatically |
| **Finance** | Two income streams (Employment in USD, Business in BRL), received vs. expected, recurring revenue, monthly goals |
| **Applications** | International job tracker with an honest funnel (the furthest stage reached is kept even after a rejection) |
| **Learning** | Skill Matrix that grows **by evidence** (practiced +5, shipped +10, owned end-to-end +20), not by hours of courses |
| **Achievements** | Unlock automatically from real data (first application, 10 tickets, first US$, R$ 5k month…) |
| **Reports** | Productivity, development activity, revenue per month, hours by project and by type of work |

## Tech stack

- **Next.js 16** (App Router, Server Components, Server Actions, `proxy.ts`) + **React 19** (`useActionState`, `useOptimistic`)
- **TypeScript**, **Tailwind CSS v4**
- **PostgreSQL** + **Prisma 7** (driver adapter `@prisma/adapter-pg`)
- **Zod 4** for validation
- Auth: **JWT session cookie** (`jose`) + **bcrypt** password hashing
- **Recharts** for charts, **lucide-react** icons
- **Vitest** for unit tests

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how it fits together.

## Getting started

Requirements: Node.js 22+.

```bash
npm install
cp .env.example .env          # then fill SESSION_SECRET and SEED_PASSWORD
npx tsx scripts/secret.ts     # prints a value for SESSION_SECRET
```

Start a local PostgreSQL (no Docker needed — it runs an embedded Postgres in `.pgdata/`) and keep this terminal open:

```bash
npm run db:start
```

In another terminal:

```bash
npm run db:migrate   # create the tables
npm run db:seed      # first user + goals + Sprint 00/01
npm run dev          # http://localhost:3000
```

Sign in with `SEED_EMAIL` / `SEED_PASSWORD` from your `.env`.

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Generate Prisma client + production build |
| `npm test` | Unit tests (Vitest) |
| `npm run lint` | ESLint |
| `npm run db:start` | Local PostgreSQL on port 54329 |
| `npm run db:migrate` | Create/apply migrations |
| `npm run db:seed` | Seed the first user |
| `npm run db:studio` | Prisma Studio (browse the database) |

## Deploy

1. Create a managed Postgres (Neon or Supabase) and copy its connection string.
2. On Vercel, import the repository and set `DATABASE_URL`, `SESSION_SECRET` (and optionally `GITHUB_TOKEN`).
3. Run `npx prisma migrate deploy` against the production database, then `npm run db:seed` once with `SEED_PASSWORD` set.

## Project structure

```
prisma/            schema, migrations and seed
scripts/           local Postgres + secret generator
src/
  actions/         Server Actions (every mutation re-checks the session)
  app/
    (app)/         authenticated pages (dashboard, work, crm, finance…)
    login/         sign-in page
  components/      UI building blocks and shared components
  lib/             data access, dates/timezone, goals, metrics, rules
  proxy.ts         optimistic route protection
tests/             unit tests
```

## License

Private project — © Lavínia Ferraz.
