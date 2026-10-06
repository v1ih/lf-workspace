# Changelog

All notable changes to this project are documented here. Format based on [Keep a Changelog](https://keepachangelog.com/).

## [0.2.0] — 2026-10-06

### Added
- Ticket category (Development / Business / Career / Administrative). Only Development tickets count toward development productivity: Reports, the monthly ticket goal and ticket achievements.
- "Tickets by category" chart in Reports.
- Collapsible sidebar (remembered in a cookie) with Dashboard and Today always pinned at the top and Settings at the bottom.

### Changed
- Sprint 00 (onboarding) tickets are classified as Administrative.

## [0.1.0] — 2026-10-06 · Onboarding Day

### Added
- Project setup: Next.js 16, TypeScript, Tailwind CSS v4, Prisma 7 + PostgreSQL, local embedded Postgres script.
- Authentication with JWT session cookie, bcrypt and route protection via `proxy.ts`.
- Dashboard with KPIs, monthly goals, weekly hours chart, application funnel and activity feed.
- Today page with Daily and End of Day report.
- Kanban with drag & drop, task editor, submit for review and per-task time tracking.
- Sprints, Projects, Clients (with effective hourly rate) and Time Tracking.
- CRM pipeline (won leads become clients), Finance with two income streams and receivables.
- International job applications tracker with honest funnel.
- Skill Matrix by evidence and automatic achievements.
- Reports and Settings (profile, password, monthly goals).
- Unit tests for dates, goals, achievements and skills.
