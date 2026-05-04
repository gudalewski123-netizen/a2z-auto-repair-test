# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Trades Website Template (`artifacts/trades-template`)
- Static marketing/landing page for service-based businesses (car detailing)
- React + Vite, port 20624, previewPath `/`

### Lead CRM (`artifacts/crm`)
- Lightweight multi-tenant CRM for service-based businesses
- Features: dashboard with metrics, contacts table with search/filter, pipeline kanban (drag-and-drop via `@hello-pangea/dnd`), lead capture form, contact detail with jobs/activities/follow-ups, CSV export, source tracking
- **Auth**: Email/password login with bcrypt hashing, JWT cookie sessions (7-day expiry), auto-login persistence
- **Multi-tenant**: All data tables include `user_id` — each logged-in user sees only their own data
- **Theme**: Dark/light mode toggle via ThemeProvider context (`src/lib/theme.tsx`), persisted in localStorage. Toggle in sidebar bottom + login/register pages (top-right icon). CSS uses `.dark` class on `<html>` with custom variant `@custom-variant dark (&:is(.dark *))`. Glass classes (`.glass`, `.glass-subtle`, `.glass-strong`, `.glass-sidebar`, `.glass-input`) all have dark variants.
- React + Vite + Tailwind v4 + shadcn/ui, port 22444, previewPath `/crm/`
- Uses generated API hooks from `@workspace/api-client-react` (Orval codegen)
- Pages: login (`/login`), register (`/register`), dashboard (`/`), contacts (`/contacts`), contact detail (`/contacts/:id`), pipeline (`/pipeline`), lead form (`/leads/new` — public, no auth required)
- Protected routes redirect to `/login` if not authenticated; guest routes (login/register) redirect to `/` if already logged in

### API Server (`artifacts/api-server`)
- Express 5 backend serving all API routes under `/api`
- Port 8080, routes: auth (register/login/logout/me), contacts CRUD, jobs CRUD, activities, follow-ups, dashboard summary/pipeline/source-breakdown/recent-activity, public lead capture, CSV export
- Auth middleware (`requireAuth`) protects all routes except health, auth, and lead capture
- Ownership validation: job/follow-up creation verifies contact belongs to the requesting user
- Public lead capture only matches unowned contacts (`user_id IS NULL`) to prevent cross-tenant mutation
- Uses Drizzle ORM with PostgreSQL, bcryptjs for password hashing, jsonwebtoken for JWT sessions
- `JWT_SECRET` env var is required (server refuses to start without it)

## Database Schema (Drizzle)
- `users` — id, email (unique), password (bcrypt hash), business_name, created_at
- `contacts` — user_id (FK), name, email, phone, status (new_lead/contacted/booked/completed/lost), source, tags, notes, service_requested, total_revenue
- `jobs` — user_id (FK), contact_id (FK), service_type, price, date, notes
- `activities` — user_id (FK), contact_id (FK), action, details
- `follow_ups` — user_id (FK), contact_id (FK), due_date, note, status (pending/completed/dismissed)
