# CLAUDE.md — TIER 2 Template (TIER-2-TEMPLATE)

## What this is
The **Tier 2 starter template** for new client sites. Use this when a client needs:
- Everything Tier 1 has (marketing site, admin login, FormSubmit lead capture)
- Plus a full CRM (contacts, pipeline, jobs)
- Plus optional online booking (Cal.com or any iframe-friendly scheduler)
- Plus a multilingual UI (English, Spanish, Chinese, Tagalog, Vietnamese)
- Plus the TextFlow SMS automations (Phase 2 — wired into CRM events)

For lightweight marketing-only sites, use **TIER1REMIXONLYTemplate** instead.

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

## Build-time safety nets (added priorities 4 + 5)

### `scripts/check-config.sh` — pre-build config validator
Wired into `artifacts/trades-template/package.json`'s `prebuild` hook. Fails the Vercel/local build if:

- `BUSINESS.email` is empty AND `PITCH_MODE` is false → would silently route leads to `teddy.nk28@gmail.com`
- `BUSINESS.name` is still `[Client Business Name]` placeholder AND `PITCH_MODE` is false → forgot to customize

Bypass for genuine edge cases: `SKIP_CONFIG_CHECK=1 pnpm build`.

### `scripts/smoke-test.sh` — post-deploy verification
Run after every `pnpm push` / Render rebuild:
```bash
./scripts/smoke-test.sh https://<render-url> https://<vercel-url>
```

Checks Render health, Vercel root, Vercel→Render API proxy, admin route mounted. ~10 seconds, catches the 4 most common breakages. Step is also baked into `CHECKLIST.md` so it's hard to forget.

---

## Tier 1 — Leads dashboard (delivers the "Admin dashboard for leads" promise)

### How leads flow
1. **Customer submits the quote form** on the public site
2. **QuoteForm.handleSubmit** does two things in parallel:
   - `POST /api/leads` → saves to the DB (source of truth for the dashboard)
   - `POST formsubmit.co/<BUSINESS.email>` → emails the recipient (notification)
3. If backend is down or unreachable, the FormSubmit email still goes out — no lost leads.
4. If FormSubmit is unactivated, the lead still shows in the dashboard.

### Admin auth (username + in-app credential rotation)

Default factory login: username `Admin`, password `Password`. Active only while
the `admin_users` table is empty. Once the operator rotates credentials in-app,
the defaults stop working.

Flow:
- Sign in at `/admin` with username + password → backend issues a JWT signed
  with `SESSION_SECRET`, valid for 7 days
- Frontend stores it in `localStorage` as `admin_token` and sends it on every
  protected request as `Authorization: Bearer <token>`
- A sticky orange banner appears post-login if `admin_users` is empty,
  prompting the user to rotate credentials in the **Account** tab
- "Sign out" clears localStorage

Rotating credentials (Account tab):
- Requires current password + new username (≥3 chars) + new password (≥8 chars)
- Replaces the `admin_users` row atomically (DELETE + INSERT in a transaction)
- All passwords are bcrypt-hashed (cost 12)
- After rotation the operator is signed out and must re-login with the new pair

Emergency recovery — `ADMIN_PASSWORD` env var on Render is a break-glass
override. Any username + this password is accepted, regardless of what's in
the DB. Use it if you forget the in-app credentials.

Full reset (forgot everything, no `ADMIN_PASSWORD` either):
```bash
psql "$DATABASE_URL" -c "DELETE FROM admin_users;"
```
After this the default `Admin` / `Password` login works again.

Endpoints:
- `POST /api/admin/login` — body `{ username, password }` → `{ token, username }`
- `GET /api/admin/me` — `{ username, isDefault }` (isDefault means table is empty)
- `POST /api/admin/credentials` — body `{ currentPassword, newUsername, newPassword }`
- `GET /api/admin/leads` — list all leads, newest first
- `PATCH /api/admin/leads/:id` — update status or adminNotes
- `DELETE /api/admin/leads/:id` — hard delete

### Statuses
`new` → `contacted` → `won` or `lost`. Color-coded badges in the UI. Click any lead row to expand and update status / add internal notes.

### Backend env vars required
- `SESSION_SECRET` — auto-generated by render.yaml (signs admin JWTs; legacy `JWT_SECRET` still works as fallback)
- `ADMIN_PASSWORD` — auto-generated by render.yaml (emergency override only — not the primary login)
- `DATABASE_URL` — Neon connection string

### What the dashboard shows
- **Leads tab** (default): table of all leads with date, name, service, phone, status badge. Click row to expand → full message, status dropdown, internal notes textarea (autosaves on blur), delete button. Status filter pills at the top (all / new / contacted / won / lost).
- **Brand tab**: BUSINESS name + theme colors + services count. Reference view of what config.ts is shipping.
- **Account tab**: change username + password.

### When this might 503
- Database not reachable → `/api/admin/leads` and `/api/admin/me` return 500. Check Neon project status.

## Design Workflow
Before writing any frontend code, read `FRONTEND.md` — it has the anti-generic guardrails, screenshot workflow, and business-info propagation rules.

## Business Info Propagation
Source of truth: `business.config.json` (root). Run `node scripts/sync-business-info.mjs` to push it into `src/config.ts` and print the env vars for Render.

---

## Multilingual UI (5 languages — auto-enabled)

The site ships with i18n built in. Five languages are wired up out of the box:

| Code | Language     | Native label  |
|------|--------------|---------------|
| en   | English      | English       |
| es   | Spanish      | Español       |
| zh   | Chinese (Simplified) | 中文 |
| tl   | Tagalog      | Tagalog       |
| vi   | Vietnamese   | Tiếng Việt    |

**How it works:**

- `artifacts/trades-template/src/i18n.ts` initializes `i18next` + `react-i18next` with browser language detection. Imported once from `main.tsx` — no provider needed.
- Translations live in `artifacts/trades-template/src/locales/{en,es,zh,tl,vi}.ts`. The `en.ts` exports the canonical `TranslationKeys` type; the other 4 must satisfy it.
- The `<LanguageSwitcher />` component (in `src/components/`) renders a globe-icon dropdown in the nav (desktop + mobile menu).
- Choice persists to `localStorage` under the key `i18nextLng`.
- **Only UI chrome is translated** (nav, section headers, button labels, footer, contact card labels, quote form). **Business content** (BUSINESS.name, SERVICES, ABOUT bodies, REVIEWS) stays in the source language by design — clients can translate per-language manually if needed.

**Adding more languages:** create `src/locales/<code>.ts`, register it in `i18n.ts`, add it to `SUPPORTED_LANGUAGES`. Done.

**For Miami-area clients specifically:** Haitian Creole (`ht`) and Brazilian Portuguese (`pt-BR`) outrank Chinese/Tagalog/Vietnamese in real customer volume. Easy to swap if a client wants — just translate one of the existing locale files and update `SUPPORTED_LANGUAGES`.

---

## Online booking (optional, Cal.com or similar)

A `<BookingSection />` renders before the QuoteForm IF `business.config.json` has a non-empty `calBookingUrl` field. Otherwise the section is hidden entirely.

**Setup for a client:**

1. Client creates a free Cal.com account → connects their Google/Outlook/iCloud calendar → publishes a public booking page (e.g. `https://cal.com/mikes-lawn-care`).
2. You set `"calBookingUrl": "https://cal.com/mikes-lawn-care"` in `business.config.json`.
3. The "Book Online" link automatically appears in the nav, and the booking section renders with an iframe of the scheduler.

**Why Cal.com over a custom Google Calendar integration:**
- Zero backend code, zero OAuth flow per client
- Client connects their own calendar, controls their own availability
- Free for the client's plan
- The iframe just works; Cal.com sets the right embed headers by default

**Works with any iframe-friendly scheduler** (Calendly, SimplyBook, etc.) — just paste the public booking URL.

---

## Phase 2 features (planned — not yet implemented)

These are queued behind TextFlow API integration. They will land as a separate PR once we have the TextFlow API base URL, auth method, and SMS-send endpoint:

- SMS auto-response on new lead (fires when a QuoteForm submission lands in `/api/leads`)
- Missed-call text-back (requires TextFlow voice webhooks; pending TextFlow capability check)
- Automated review-request SMS (fires when a job is marked complete in the CRM)

When TextFlow API details land, the integration should live in `artifacts/api-server/src/lib/textflow.ts` and be triggered from the relevant route handlers. Don't sprinkle SMS calls across the codebase — keep them in one module.

---

## TextFlow lead auto-response (Phase 2A — implemented)

When a customer fills out the QuoteForm, three things happen in parallel:

1. **POST to `/api/leads`** (our backend) — saves to DB so the admin dashboard sees it
2. **POST to FormSubmit** (HTTPS) — emails the configured recipient
3. **Backend then fire-and-forget POSTs to TextFlow** — TextFlow's auto-outreach SMS goes out

Step 3 only runs if `TEXTFLOW_LEADS_WEBHOOK_URL` env var is set on the
Render service. It's per-client because each client has their own TextFlow
account (and thus their own message template + Twilio number).

### How it's wired

- Adapter: `artifacts/api-server/src/lib/textflow.ts` — wraps the TextFlow
  POST with a 5s timeout, structured logging, and graceful failure (never
  rejects to the caller).
- Route: `artifacts/api-server/src/routes/leads.ts` — calls
  `forwardLeadToTextFlow()` after the DB save, fire-and-forget.
- Frontend: `App.tsx` QuoteForm now sends `business`, `trade`, `city`
  alongside the standard form fields, so TextFlow's message template can
  reference them as `{business}` / `{trade}` / `{city}`.

### Setup per client

1. Client signs up for TextFlow at https://textflow.tech
2. In TextFlow dashboard → set their outreach message template
   (e.g. *"Hi {name}, thanks for reaching out to {business}! We do {trade}
   in {city}. When's a good time to call?"*)
3. Client copies their unique webhook URL from the dashboard. It looks like
   `https://textflow-website.replit.app/api/public/leads/<api-key>`
4. Paste that URL into `TEXTFLOW_LEADS_WEBHOOK_URL` on the client's Render
   service (Render → Environment → add var)
5. Test: submit a QuoteForm on the live site → check TextFlow's inbox AND
   the test phone receives the SMS within ~30s

### Failure modes

- `TEXTFLOW_LEADS_WEBHOOK_URL` not set → skipped silently (intended; client
  hasn't configured TextFlow yet). Lead still saved to DB, FormSubmit still
  emails the recipient.
- TextFlow returns `outreach: failed, reason: unresolved_placeholders` →
  client's TextFlow message template references variables we don't send.
  Currently we send `name`, `phone`, `email`, `message`, `business`, `trade`,
  `city`. Anything else needs to be added in `routes/leads.ts`.
- TextFlow times out (>5s) → logged as warning, no impact on user-facing
  form submission.

### Out of scope for Phase 2A (queued for 2B / 2C)

- Missed-call text-back (per-client Twilio number provisioning + voice webhook)
- Automated review-request SMS (fires on CRM job-complete)
- AI conversation handler for incoming SMS replies

Those need direct Twilio (not TextFlow) since TextFlow's public API only
exposes the lead-forwarding endpoint.
