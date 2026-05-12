# CLAUDE.md — TIER-2 Site Setup Playbook

**Read this file the moment a Claude Code session starts inside this repo.**

It tells you what this project is, how to customize it for a new client, and how to provision and deploy. TIER-2 is the **full-stack** offering — marketing frontend + CRM frontend + Express API + Postgres DB. Use this when the client needs lead management or a portal. For lighter sites, use TIER-1 (separate template repo).

---

## 0. Hard constraint: new repos must be under `teddyk28`

When using this template to spin up a new client site, the new repo **must** be created under the GitHub user `teddyk28`. Render and Vercel both have their GitHub Apps installed only on `teddyk28` — they will reject API requests to create services/projects from repos under any other account. The provision scripts in `scripts/provision/` enforce this and exit with a clear error.

If you're a user other than Teddy and don't have permission to create repos under `teddyk28`, see `TEDDY-SETUP.md` for the one-time GitHub PAT setup.

## 1. What this repo is

A pnpm-workspace monorepo with four deployable pieces and a shared DB layer:

| Path | What it is | Where it deploys |
|---|---|---|
| `artifacts/trades-template/` | Vite + React + Tailwind v4 marketing site (public, no auth) | Vercel project A (e.g. `acme-roofing.vercel.app`) |
| `artifacts/crm/` | Vite + React CRM (login, contacts, pipeline, leads, site-settings) | Vercel project B (e.g. `acme-roofing-crm.vercel.app`) |
| `artifacts/api-server/` | Express 5 + Drizzle ORM, JWT cookie auth | Render |
| `lib/db/` | Drizzle schema with users, contacts, activities, jobs, site-change-requests | Neon (one DB per site) |

The stack: **Cloudflare DNS → Vercel (×2) → Render → Neon Postgres → FormSubmit for email**. Auto-deploys on push to `main`.

## 2. Are you in the template or a fresh clone?

Check the repo name (`git remote get-url origin`):

- If it ends in `TIER-2-TEMPLATE` → you're **in the template itself**. Don't customize. The user is probably exploring.
- If it ends in anything else (e.g. `acme-roofing`) → fresh clone for a new client. **Proceed below.**

## 3. Gather client info

Ask the user (or accept from prompt brief). Bold = required, italic = optional.

- **Business name** (full, e.g. "ACME Roofing Co.") and **shortName** (e.g. "ACME Roofing & Remodeling")
- **subTagline** — small text under the logo (e.g. "Roofing & Remodeling")
- **Trade/category** (e.g. "Roofing Contractor")
- **Location** (city, state)
- **Service area** (e.g. "Miami & All of Miami-Dade County, FL")
- **Phone** (formatted, e.g. `(786) 555-1234`) and **phoneRaw** (`+17865551234`)
- *Email* — if blank, the email card on the contact section is hidden
- *Hours*
- *Years in business* — if blank, the floating "X+ Years Experience" badge is hidden
- **3-6 services** — name + 1-line description each
- **Brand colors** in HSL (e.g. `"217 91% 55%"` — no `hsl()` wrapper). At minimum: primary, background, accent
- *3 sample reviews* — name + text + source (Google Review, Yelp, etc.). If blank, set `REVIEWS_SECTION.showSection = false`.
- **Domain** (e.g. `acmeroofing.com`) — must already be on Cloudflare

## 4. Customize the template files

### Single source of truth for marketing site
**`artifacts/trades-template/src/config.ts`** — contains BUSINESS, HERO, HERO_BADGES, SERVICES_SECTION, SERVICES, ABOUT, CTA_BANNER, REVIEWS_SECTION, REVIEWS, CONTACT_SECTION, FOOTER, THEME. Read it first to see the schema, then replace each export with the client's values.

### Required edits

| File | What to change |
|---|---|
| `artifacts/trades-template/src/config.ts` | Replace every exported object with the new client's info |
| `artifacts/trades-template/index.html` (line 6, the `<title>`) | `<title>{Business Name} \| {City, State}</title>` |
| `vercel.json` (root) | After Render deploy: replace `YOUR-RENDER-SERVICE.onrender.com` with actual Render URL. After CRM Vercel project is created: replace `YOUR-CRM-PROJECT.vercel.app` with the CRM's Vercel URL. |
| `artifacts/crm/vercel.json` | Replace `YOUR-RENDER-SERVICE.onrender.com` with actual Render URL |

### Optional image swaps (in `artifacts/trades-template/public/`)

| File | What it is | Default behavior |
|---|---|---|
| `favicon.svg` | Browser tab icon | Leave + flag as TODO if user didn't provide |
| `hero-bg.png` | Homepage hero background | Leave + flag as TODO |
| `team-photo.jpg` | About section photo | Leave + flag as TODO |
| `services-bg.png` | CTA banner texture overlay | Rarely needs swap, leave as-is |

If user gave image URLs, `curl -L -o <path> <url>`. If local files, copy them.

### The CRM (`artifacts/crm/`) — generally NO per-client customization

The CRM is per-user driven: each client registers with their `businessName`, which gets stored on their User record and shown throughout the CRM. **You usually don't need to edit any files in `artifacts/crm/`.**

Exception: if the user wants a custom CRM login page background, branding, or theme — those are in `artifacts/crm/src/pages/login.tsx` and `artifacts/crm/src/index.css`. Treat as a separate task if asked.

### Default copy generation

If user gave sparse info (e.g., just "ACME Roofing in Boca"), generate plausible defaults:

- `HERO.headline1` + `headline2`: short, punchy 2-3 words each
- `ABOUT.body1/2`: 2-3 sentences each, mention the trade and service area
- `SERVICES`: pick 4-6 standard offerings for that trade
- `REVIEWS`: leave existing placeholders + set `REVIEWS_SECTION.showSection = false`, flag for client to provide

Don't fabricate phone numbers, email addresses, or specific claims like "Licensed #XYZ". Leave as empty strings or flag for the client.

## 5. Provision the platforms

Tokens live in `~/.tier1-config/.env` (one-time setup — see `TEDDY-SETUP.md`). Helper scripts at `scripts/provision/` do the API calls.

Order matters — **Render before Vercel**, because each Vercel project's rewrite needs the Render URL.

```bash
SLUG=acme-roofing               # the client repo slug, no spaces
DOMAIN=acmeroofing.com

# 1. Neon DB
DATABASE_URL=$(./scripts/provision/neon.sh "${SLUG}-prod")

# 2. Render API — pass all four expected origins (both Vercel-default URLs +
#    both custom domains) for CORS
RENDER_URL=$(./scripts/provision/render.sh "${SLUG}-api" "$DATABASE_URL" \
  "https://${DOMAIN},https://www.${DOMAIN},https://crm.${DOMAIN},https://${SLUG}.vercel.app,https://${SLUG}-crm.vercel.app")
RENDER_HOST="${RENDER_URL#https://}"

# 3. Update both vercel.json files with the real Render URL
sed -i.bak "s|YOUR-RENDER-SERVICE.onrender.com|${RENDER_HOST}|g" vercel.json artifacts/crm/vercel.json
rm vercel.json.bak artifacts/crm/vercel.json.bak

# 4. Commit + push so Vercel reads the right Render URL on first build
git add -A && git commit -m "Provision: wire Render URL into vercel.json" && git push origin main

# 5. Vercel project A — marketing site (root directory = repo root)
MARKETING_URL=$(./scripts/provision/vercel.sh "${SLUG}" "${DOMAIN}")

# 6. Vercel project B — CRM (root directory = artifacts/crm)
CRM_URL=$(./scripts/provision/vercel.sh "${SLUG}-crm" "crm.${DOMAIN}" "artifacts/crm")

# 7. Update root vercel.json with the CRM URL so /crm/* proxy routing works
sed -i.bak "s|YOUR-CRM-PROJECT.vercel.app|${CRM_URL#https://}|g" vercel.json
rm vercel.json.bak
git add vercel.json && git commit -m "Provision: wire CRM URL into root vercel.json" && git push origin main

# 8. Cloudflare DNS — apex + www for marketing, crm subdomain for CRM (one call)
./scripts/provision/cloudflare.sh "${DOMAIN}" "crm"
```

## 6. Verify

Wait ~60-90 seconds, then:

- **Marketing**: `curl -I https://<marketing>.vercel.app` → 200
- **CRM**: `curl -I https://<crm>.vercel.app` → 200
- **API health**: `curl https://<render-url>/api/health` → 200 with `{"status":"ok"}`
- **Cloudflare**: `dig +short <domain>` and `dig +short crm.<domain>` should resolve
- **End-to-end**: visit the live domain, check rebranding showed; click "Admin" → goes to CRM; register a user; log in.

If anything 404s or shows OLD branding, push an empty commit (`git commit --allow-empty -m "Trigger rebuild"`).

## 7. Report to the user

```
Marketing site:   https://acmeroofing.com
CRM:              https://crm.acmeroofing.com
Render API:       https://acme-roofing-api-abc.onrender.com
Neon project:     gentle-cloud-XXXXXX
GitHub repo:      https://github.com/teddyk28/acme-roofing

TODOs for the client:
- Provide real hero image, team photo, favicon (currently placeholders)
- Provide 3 Google reviews to replace placeholders
- Register first admin user at /register on the CRM
```

## 8. Known gotchas

- **Render free tier blocks SMTP** (ports 25/465/587). Always FormSubmit, always from the frontend. Backend `fetch` to FormSubmit fails because Node strips Origin/Referer.
- **FormSubmit "needs activation" returns HTTP 200**. Parse the JSON body for `success: "true"`, not just status code. Activation links expire ~24 hours.
- **Two Vercel projects, one repo** — both linked to the same repo, different Root Directories. `vercel.sh` handles both: the 3rd positional arg is `[root-directory]` (default `.`, set to `artifacts/crm` for the CRM project).
- **Both vercel.json files have `YOUR-RENDER-SERVICE` and (root only) `YOUR-CRM-PROJECT` placeholders** — fill in via `sed` after the platforms exist. Don't forget either.
- **CORS** — `ALLOWED_ORIGINS` on Render must include every frontend origin (both Vercel URLs and both custom domains). Missing one will cause CRM login to fail with a CORS error.
- **Render auto-suffixes service names** if there's a collision. Always grab the actual `.onrender.com` URL from the API response.
- **Neon UI masks passwords** — `neon.sh` captures the connection string from the API response (which includes the password) and saves it to `~/.tier1-config/databases/`.
- **`vite.config.ts` requires `PORT` and `BASE_PATH` env vars at config load time** (even for `vite build`). Both vercel.json files inline them.
- **The CRM's `vercel.json` uses `cd ../.. && pnpm install`** — it cd's up from `artifacts/crm` to the workspace root so pnpm finds `pnpm-workspace.yaml`.
- **Stripe webhook URL must point directly at Render**, not via Vercel — Vercel's proxy mangles raw body for signature verification.
- **Cloudflare CNAMEs must be gray cloud** (proxy DISABLED) and target `vercel-dns-017.com`.

## 9. File map for Claude

When you need to find something:

- **All editable marketing content** → `artifacts/trades-template/src/config.ts`
- **Marketing layout/components** → `artifacts/trades-template/src/App.tsx`
- **Theme application** → `artifacts/trades-template/src/App.tsx` `useApplyTheme()` hook
- **Tailwind v4 + CSS variables** → `artifacts/trades-template/src/index.css`
- **CRM app** → `artifacts/crm/src/{App.tsx, pages/, lib/auth.tsx, components/}`
- **Backend routes** → `artifacts/api-server/src/routes/{auth,admin,contacts,leads,pipeline,dashboard,activities,followups,jobs,site-changes,health}.ts`
- **DB schema** → `lib/db/src/schema/{users,contacts,activities,followups,jobs,sitechangerequests}.ts`
- **Deploy configs** → `vercel.json` (root), `artifacts/crm/vercel.json`, `render.yaml`
- **Provision scripts** → `scripts/provision/`
- **Setup guide** → `TEDDY-SETUP.md`
- **This file** → `CLAUDE.md`

---

**End of playbook.** When in doubt, ask the user — don't guess at brand colors, copy, or domain names. One round of clarifying questions is fine.
