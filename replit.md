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
- Lightweight CRM for service-based businesses
- Features: dashboard with metrics, contacts table with search/filter, pipeline kanban (drag-and-drop via `@hello-pangea/dnd`), lead capture form, contact detail with jobs/activities/follow-ups, CSV export, source tracking
- React + Vite + Tailwind v4 + shadcn/ui, port 22444, previewPath `/crm/`
- Uses generated API hooks from `@workspace/api-client-react` (Orval codegen)
- Pages: dashboard (`/`), contacts (`/contacts`), contact detail (`/contacts/:id`), pipeline (`/pipeline`), lead form (`/leads/new`)

### API Server (`artifacts/api-server`)
- Express 5 backend serving all API routes under `/api`
- Port 8080, routes: contacts CRUD, jobs CRUD, activities, follow-ups, dashboard summary/pipeline/source-breakdown/recent-activity, public lead capture, CSV export
- Uses Drizzle ORM with PostgreSQL

## Database Schema (Drizzle)
- `contacts` — name, email, phone, status (new_lead/contacted/booked/completed/lost), source, tags, notes, address, vehicle info
- `jobs` — linked to contact, service type, description, price, status, scheduled/completed dates
- `activities` — linked to contact, type (call/email/note/meeting/other), description
- `follow_ups` — linked to contact, due date, type, notes, status (pending/completed/dismissed)
