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

---

## ⚠️ Known sandbox gotchas (from May 13 test-run findings)

If you're running this through Cowork (Claude desktop), the sandbox is isolated:

1. **`~/Claude/cowork-handoff/` is NOT auto-mounted.** Paste API tokens inline in your first message of every new task — don't rely on the sandbox reading credential files from there.

2. **Sandbox can't auth to GitHub for private clones.** Mount the parent `~/Projects/` folder when starting the task; the agent will copy from `~/Projects/templates/TIER1REMIXONLYTemplate/` locally instead of cloning from GitHub.

3. **Some mounts are read-only / block deletes.** If the agent leaves a `README_TODO.md` flagging files to remove, do that manually via Finder or Terminal:
   ```bash
   rm <client-folder>/artifacts/trades-template/public/<placeholder-files>
   ```

4. **After copying scripts from a local template clone**, run:
   ```bash
   chmod +x scripts/*.sh
   ```
   Without this, `./scripts/bootstrap-client.sh` will fail with "permission denied".

---

## Sanity checks for any agent working on this template

(Same as Tier 1.)

1. **You're on the TEMPLATE**, not a previous client. Don't mirror cleanslate-softwash or thetradestack — those are live sites with client-specific assets.
2. **`artifacts/trades-template/src/config.ts`** is the source of truth for branding. The CRM app at `artifacts/crm/` has its own theming.
3. **`PITCH_MODE`** in trades-template/src/config.ts lets you ship a design preview without backend provisioning.
4. **`CHECKLIST.md`** at repo root is the per-fork launch checklist.
5. **Photos in `public/`** are generic names — keep them that way.
6. **Google Business Profile phone numbers can be call-tracking lines.** Verify against the client's real website.
