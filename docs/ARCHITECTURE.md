# Architecture

## Overview

LF Workspace is a single Next.js application. There is no separate API server: pages are **React Server Components** that read the database directly, and every write goes through a **Server Action**.

```
Browser ──► proxy.ts (is there a session cookie?) ──► Server Component page
                                                        │
                                                        ├── lib/dal.ts  getCurrentUser()
                                                        └── lib/db.ts   Prisma ─► PostgreSQL
Form submit / button ──► Server Action (actions/*.ts)
                          ├── requireUserId()     re-checks the session
                          ├── Zod validation
                          ├── Prisma write (always filtered by userId)
                          ├── logActivity() / syncAchievements()
                          └── revalidatePath("/", "layout")  → fresh data
```

## Key decisions

### 1. Server Actions instead of REST endpoints
Forms post straight to functions marked `"use server"`. This removes a whole layer (fetch calls, route handlers, client state for loading) and keeps validation and authorization next to the database code. `useActionState` shows errors; `useFormStatus` shows the pending state.

### 2. Authentication
- Passwords are hashed with **bcrypt** (cost 12).
- On login a **JWT** signed with `SESSION_SECRET` (HS256, 7 days) is stored in an `httpOnly`, `sameSite=lax` cookie.
- `proxy.ts` does an *optimistic* check (redirects to `/login` without a valid token). It is not the security boundary.
- The real checks are in `lib/dal.ts` (`getCurrentUser`, cached per request with React `cache`) and at the top of **every** Server Action (`requireUserId`).
- Every query filters by `userId`, so an id from another account simply returns nothing (e.g. `/clients/[id]` → 404).

Why not Auth.js? With a single credentials user, a small, explicit session module is easier to understand and audit. Moving to Auth.js later (e.g. for GitHub/Google login) only touches `lib/session.ts` and `actions/auth.ts`.

### 3. Real numbers only
Goals store **targets** (`Goal` table). Actual values are computed from records in `lib/metrics.ts`:

| Metric | Source |
| --- | --- |
| Applications | `JobApplication.appliedAt` in the month |
| Technical interviews / offers | `technicalAt` / `offerAt` milestones |
| Focused development | sum of `TimeEntry` durations |
| Tickets completed | `Task.completedAt` |
| Projects shipped | `Project.shippedAt` |
| New leads / proposals / new clients | `Lead.createdAt` / `proposalAt` / `wonAt` |
| Employment / Business income | `Transaction` with status `RECEIVED` |

Milestone timestamps are written once, when a record first reaches a stage. That keeps history honest: a rejected application still counts as "reached technical".

### 4. Timezones
Servers (Vercel) run in UTC, but "today" and "this week" must follow São Paulo. `lib/dates.ts` converts calendar days in `America/Sao_Paulo` into real instants (e.g. Oct 6 starts at `2026-10-06T03:00Z`). `DATE` columns (applied date, transaction date) are stored as UTC midnight of the local day. Covered by `tests/dates.test.ts`.

### 5. Optimistic Kanban
The board uses HTML5 drag & drop. `useOptimistic` moves the card instantly; the Server Action `moveTask` saves status and order in a transaction; revalidation then replaces the optimistic state with the server's.

### 6. Running timer
Only `startedAt` is stored (`endedAt = null` while running). The top bar's client component counts seconds locally, so there is no polling. Starting a new timer stops the previous one; ending the workday stops it too.

### 7. Achievements and activity feed
`syncAchievements()` runs after relevant mutations, compares pure rules (`lib/achievements.ts`) against current stats and stores newly unlocked keys with their date. Every meaningful action writes a line to `ActivityLog`, which powers the feed.

### 8. Cache Components disabled
Next.js 16 enables `cacheComponents` by default. Every page here depends on the signed-in user, so all routes are dynamic anyway; turning it off keeps the data flow simple (`revalidatePath` after each action).

## Data model

```
User ─┬─ Client ─┬─ Project ─┬─ Task ── TimeEntry
      │          │           └─ TimeEntry
      │          ├─ Transaction
      │          └─ Lead (clientId when won)
      ├─ Sprint ── Task
      ├─ Workday
      ├─ JobApplication
      ├─ Skill ── SkillEvidence
      ├─ Goal
      ├─ ActivityLog
      └─ Achievement
```

## Testing

- **Unit tests** (`tests/`): pure logic — formatting, timezone ranges, goals, achievements, skill levels.
- Next step: Playwright end-to-end tests for login → start timer → move a card (ticket in Sprint 01).
