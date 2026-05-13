# CLAUDE.md — TIER 2 Template (TIER-2-TEMPLATE)

## What this is
The **Tier 1 starter template** for new client sites. Use this when a client needs:
- A marketing/brochure site
- A client portal where they can request site changes
- Admin login (single admin)
- No payment processing

If they need payments + CRM + sales reps, use **TIER-2-TEMPLATE** instead.

## Stack (when deployed)
- **Frontend:** Vercel (artifacts/trades-template/)
- **Backend:** Render web service (artifacts/api-server/)
- **Database:** Neon Postgres
- **Email:** FormSubmit HTTP (frontend posts directly)
- **Optional:** Cloudflare DNS for custom domain

## Where the Neon DB is
- Pre-provisioned at Neon project `tier2-template-prod` (`proud-glitter-61389487`)
- Connection string + secrets in `~/Claude/cowork-handoff/TIER_TEMPLATES_NEON_CREDENTIALS.txt`
- The DB is shared across all forks of this template — when you spin up a real client site, **create a fresh Neon project for them** instead of reusing this DB.

## Hard Rules — Never Break
- The pnpm 11 patches in `pnpm-workspace.yaml` (`strictDepBuilds: false`, `verifyDepsBeforeRun: false`) are load-bearing.
- The `preinstall` script in root `package.json` is intentionally absent — do not re-add.
- `artifacts/api-server/src/index.ts` PORT defaults to 10000 — required for Render.
- Email goes via FormSubmit from the FRONTEND, not the backend (Node fetch strips Origin → FormSubmit rejects).
- When forking for a new client: ALSO create their own Neon DB, Render service, Vercel project, and update DATABASE_URL.

## Backend routes provided
- `/api/healthz` — health check
- `/api/admin/*` — admin login + dashboard
- `/api/auth/*` — auth shim
- `/api/portal/*` — client portal (request site changes)

## DB schema includes
- `users` (admin)
- `siteChangeRequests` (client portal submissions)

## To deploy this template for a real client
1. Fork on GitHub → rename to client's site name
2. Apply baseline patches (already applied — don't re-apply)
3. Create fresh Neon project for the client
4. Create Render web service pointing at the fork
5. Set Render env vars: DATABASE_URL (new client's), ADMIN_PASSWORD, SESSION_SECRET, ALLOWED_ORIGINS, LEAD_NOTIFY_TO
6. Run drizzle push (build command does this automatically)
7. Add Vercel project, override Output Directory to `dist/public`
8. Add `vercel.json` with API proxy + SPA fallback
9. Cloudflare DNS: CNAME → vercel-dns-017.com (proxy off)

## Status
✅ Patched and Neon-ready. Not deployed (templates aren't deployed; clones are).

---

## ⚠️ Known sandbox gotchas (from May 13 test-run findings)

If you're running this through Cowork (Claude desktop), the sandbox is isolated:

1. **`~/Claude/cowork-handoff/` is NOT auto-mounted.** Paste API tokens inline in your first message of every new task — don't rely on the sandbox reading credential files from there.

2. **Sandbox can't auth to GitHub for private clones.** Mount the parent `~/Projects/` folder when starting the task; the agent will copy from `~/Projects/templates/TIER-2-TEMPLATE/` locally instead of cloning from GitHub.

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

If you (the agent) read this and you're spinning up a new client:

1. **You are working on the TEMPLATE**, not a previous client. Don't mirror cleanslate-softwash or any other live site — its assets and admin styling are client-specific. Always copy from THIS repo's files.
2. **`config.ts` is the single source of truth for branding.** All copy, phone, services, reviews, colors live there. Frontend reads from it; backend admin.ts uses generic CSS vars.
3. **`PITCH_MODE` in config.ts** lets you ship a design preview without provisioning the backend. Set to `true` while pitching, flip to `false` after Render service is live.
4. **`CHECKLIST.md`** at repo root is the per-fork launch checklist. Tick boxes; don't ship with anything unchecked.
5. **Photos in `public/`** use generic names (`hero-bg.png`, `team-photo.jpg`). Drop the client's photos with the same names — don't introduce `IMG_xxxx.jpg`-style filenames.
6. **Phone numbers from Google Business Profile screenshots can be call-tracking lines** (e.g., Google Local Services Ads). Always verify against the client's actual website or Yelp.

---

## Placeholder photos (trade-specific stock images)

Every new client starts with **trade-themed Unsplash photos** as placeholders — the design pitch looks polished even before the client sends real photos.

**How it works:**
1. Set `BUSINESS.tradeType` in `config.ts` (e.g. `"roofing"`, `"softwash"`, `"lawn-care"`).
2. The template auto-pulls relevant Unsplash photos via `getPlaceholders(BUSINESS.tradeType)` in `placeholders.ts`.
3. When the client provides real photos, drop them in `public/` (e.g. `hero.jpg`, `about.jpg`, `gallery-1.jpg`) and update the imports in `App.tsx` to use local paths instead of the placeholder URLs.

**Supported trade keys** (12 total):
`softwash`, `roofing`, `lawn-care`, `fencing`, `auto-detailing`, `junk-removal`, `hvac`, `plumbing`, `electrical`, `painting`, `tree-services`, `cleaning`. Anything else → generic Picsum fallback.

**Adding a new trade:** edit `placeholders.ts` — add a new entry with 1 hero + 1 about + 4 gallery URLs from Unsplash.

**Broken URL?** Any specific Unsplash photo ID may go stale. Swap it: go to unsplash.com, search the keyword, click a photo, copy its URL (`https://images.unsplash.com/photo-<id>?...`), paste into placeholders.ts.

---

## Quote form / FormSubmit integration

The landing page now ships with a **FormSubmit-integrated quote form** above the footer. Workflow:

### Where the recipient email comes from

`BUSINESS.email` in `config.ts`. If empty, the form falls back to `teddy.nk28@gmail.com` (already FormSubmit-activated for many origins).

```ts
// config.ts
export const BUSINESS = {
  // ...
  email: "client@example.com",   // ← FormSubmit sends quotes here
};
```

### How submission works

1. Customer fills out the form (name, phone, email, service, optional message)
2. Form POSTs **directly from the browser** to `https://formsubmit.co/<BUSINESS.email>` (multipart/form-data, supports attachments later if needed)
3. **First submission to a new email triggers an "Activate Form" email** to that address. Recipient clicks the activation link inside (one time, takes 5 seconds, permanent thereafter).
4. All subsequent submissions deliver normally to inbox.

### Why not use the backend?

Render's free tier blocks all outbound SMTP. We tried nodemailer/Gmail — silent 10-second timeout. FormSubmit's HTTPS endpoint doesn't have that problem. The frontend POSTs directly so we never need server-side email.

### PITCH_MODE behavior

When `PITCH_MODE = true` in `config.ts`, the form section is replaced by a "Call us at <phone>" card. Lets you ship a design preview without provisioning a backend OR triggering FormSubmit activation. Flip to `false` once the backend is live and the client has confirmed they want submissions emailed.

### When switching `BUSINESS.email` to the client's address

1. Update `email:` in `config.ts`
2. Commit + push (Vercel auto-deploys)
3. Submit a test form
4. Tell the client: "Check your inbox (and spam folder) for an email from FormSubmit titled 'Confirm your email' — click the activation link, then it's permanent"
5. After they click, all submissions go to their inbox

### Probing whether an email is activated

```bash
curl -X POST https://formsubmit.co/ajax/<their-email> \
  -H "Content-Type: application/json" \
  -d '{"_subject":"activation check","Test":"probe"}'
```
Returns `{"success":"true"}` → activated. Returns `{"success":"false","message":"...needs Activation..."}` → activation email pending.

### Spam-folder reality check

FormSubmit emails frequently land in **Spam** or **Promotions**, especially the first activation email. Tell every new client to check those folders explicitly. They almost always have to fish the email out.

---

## Build-time safety nets

Same as Tier 1: `scripts/check-config.sh` (prebuild validator) + `scripts/smoke-test.sh` (post-deploy verification). See Tier 1's CLAUDE.md for details.

---

## Tier 2 — Leads dashboard

Same architecture as Tier 1's leads dashboard:
- Schema: `leadsTable` in `lib/db/src/schema/leads.ts`
- Routes: `POST /api/leads`, `GET/PATCH/DELETE /api/admin/leads`, `POST /api/admin/login`
- Auth: `ADMIN_PASSWORD` env var, sent as Bearer token
- UI: `/admin` page with Leads tab (default) + Brand tab
- QuoteForm dual-writes to `/api/leads` and FormSubmit in parallel

Tier 2 ALSO has the full CRM (contacts, jobs, activities, followups) — those live in `artifacts/crm/` and have their own admin flows. The leads dashboard described here is the entry point; once a lead becomes a customer you'd promote them into the CRM (manual today; could be a `POST /api/admin/leads/:id/promote-to-contact` endpoint later).
