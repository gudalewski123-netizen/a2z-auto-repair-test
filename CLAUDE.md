# CLAUDE.md — TIER 2 Template (TIER-2-TEMPLATE)

## What this is
The **Tier 2 starter template** for full-CRM client sites. Use this when a client needs:
- Marketing site + admin dashboard
- Full CRM: contacts, jobs, activities, follow-ups, leads pipeline
- Multi-user auth
- Site change request portal
- (Optional) payments — wire Stripe in if they're selling

If they only need a marketing site + simple admin, use **TIER1REMIXONLYTemplate** — Tier 2 is overkill.

## Stack (when deployed)
- **Frontend:** Vercel (artifacts/trades-template/ + artifacts/crm/)
- **Backend:** Render (artifacts/api-server/)
- **Database:** Neon Postgres
- **Email:** FormSubmit HTTP (frontend posts directly)

## Where the Neon DB is
- Pre-provisioned at Neon project `tier2-template-prod` (`proud-glitter-61389487`)
- Connection string + secrets in `~/Claude/cowork-handoff/TIER_TEMPLATES_NEON_CREDENTIALS.txt`
- Shared template DB. When deploying for a real client, create a fresh Neon project for them.

## Hard Rules — Never Break
- pnpm 11 patches are load-bearing (same as Tier 1).
- No `preinstall` script in root package.json (same as Tier 1).
- PORT defaults to 10000.
- FormSubmit posts go from FRONTEND, not backend.
- When deploying for a real client: ALSO create their own Neon project, Render service, Vercel project.

## Backend routes provided
- `/api/healthz` — health
- `/api/admin/*` — admin auth + dashboard
- `/api/auth/*` — user auth
- `/api/contacts/*` — CRM contacts CRUD
- `/api/jobs/*` — job pipeline
- `/api/activities/*` — activity log
- `/api/followups/*` — follow-up scheduling
- `/api/leads/*` — lead intake
- `/api/dashboard/*` — dashboard metrics
- `/api/site-changes/*` — site change requests

## DB schema includes
- `users`, `contacts`, `jobs`, `activities`, `followups`, `siteChangeRequests`

## Frontend has TWO apps
- `artifacts/trades-template/` — public marketing site
- `artifacts/crm/` — admin CRM dashboard (separate Vercel project — deploy as `crm.<clientdomain>.com`)

## To deploy this template for a real client
1. Fork on GitHub → rename to client's name
2. Create fresh Neon project for the client
3. Create Render web service (1 service handles both frontends' API)
4. Set env vars on Render
5. Create TWO Vercel projects:
   - Marketing site (`artifacts/trades-template/`) → `clientdomain.com`
   - CRM dashboard (`artifacts/crm/`) → `crm.clientdomain.com`
6. Add `vercel.json` to each with API proxy → Render
7. Cloudflare DNS: 2 CNAME records, both → vercel-dns-017.com

## Status
✅ Patched and Neon-ready. Not deployed.
