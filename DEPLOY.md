# Deploy Checklist — TIER-2

How to spin up a new TIER-2 client site (marketing frontend + CRM + API + DB). Follow in order — Render before Vercel, because each Vercel project's rewrite needs the Render URL.

TIER-2 always deploys all four pieces: **Neon DB, Render API, Vercel trades-template, Vercel CRM**, plus Cloudflare DNS. No static-only variant.

## 0. Clone the template

1. On GitHub, click **Use this template → Create a new repository**.
2. Owner: `teddyk28`. Name: `<client-slug>` (e.g. `acme-roofing`).
3. Set to Private. Click **Create repository from template**.

## 1. Neon — create the database

1. Log in to [console.neon.tech](https://console.neon.tech).
2. **Create Project** → name: `<client-slug>-prod` → region: `us-east-1` → Free tier.
3. **Do not enable Neon Auth.**
4. Copy the connection string (Neon masks passwords — copy the full URL with password before it disappears).
5. Ensure the connection string ends with `?sslmode=require&channel_binding=require`. Add it if missing.

## 2. Render — deploy the backend

1. Log in to [render.com](https://render.com).
2. **New → Blueprint** → connect your GitHub → pick the new repo → Render auto-detects `render.yaml`.
3. When prompted for env vars, paste the Neon `DATABASE_URL`. Set `ALLOWED_ORIGINS` to a placeholder for now (you'll update in step 5).
4. Click **Apply**. Render builds and deploys.
5. If Render forces "Starter" plan, downgrade to **Free** in the service's plan settings post-creation.
6. **Copy the actual service URL** (e.g. `https://api-server-abc123.onrender.com`).
7. First build runs `drizzle-kit push` which creates all DB tables in Neon.

## 3. Vercel — deploy BOTH frontends (two separate projects)

### 3a. Marketing site (trades-template) — Vercel project A

1. Open `vercel.json` (at repo root). Replace `YOUR-RENDER-SERVICE.onrender.com` with the actual Render URL from step 2.6. Leave the `YOUR-CRM-PROJECT.vercel.app` placeholders for now (we'll fill those in step 3b).
2. Log in to [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. **Root Directory**: leave as default (`.`).
4. Vercel reads the root `vercel.json` automatically. Click **Deploy**.
5. Copy the live `*.vercel.app` URL (e.g. `acme-roofing.vercel.app`).

### 3b. CRM (crm app) — Vercel project B

1. In Vercel: **Add New → Project** → import the **same repo** again.
2. **Root Directory**: set to `artifacts/crm`. (This is crucial — Vercel will read `artifacts/crm/vercel.json`.)
3. Click **Deploy**.
4. Copy the CRM's `*.vercel.app` URL (e.g. `acme-roofing-crm.vercel.app`).

### 3c. Wire the CRM URL into the marketing site

1. Open `vercel.json` (root) again. Replace `YOUR-CRM-PROJECT.vercel.app` with the CRM's Vercel URL from step 3b.4.
2. Commit + push. The marketing site's `/crm/*` requests will now proxy to the CRM project.

## 4. Cloudflare — wire up the domain(s)

The simplest pattern: marketing site at the apex, CRM at `crm.yourdomain.com` subdomain.

1. In Cloudflare, open the DNS settings for the client's domain.
2. Add CNAME records:
   - **apex** (`@` or root) → `vercel-dns-017.com` — proxy **DISABLED** (gray cloud) — points to marketing site
   - **www** → `vercel-dns-017.com` — proxy **DISABLED** (gray cloud)
   - **crm** → `vercel-dns-017.com` — proxy **DISABLED** (gray cloud) — points to CRM
3. In Vercel project A (marketing) settings → **Domains**, add the apex + `www` domains.
4. In Vercel project B (CRM) settings → **Domains**, add `crm.yourdomain.com`.
5. Update Render's `ALLOWED_ORIGINS` env var to include ALL frontend origins:
   ```
   https://yourdomain.com,https://www.yourdomain.com,https://crm.yourdomain.com,https://<vercel-a>.vercel.app,https://<vercel-b>.vercel.app
   ```

## 5. Register the first admin user (CRM)

1. Visit `https://crm.<domain>/register` in a browser.
2. Register with the client's email + a strong password. The `businessName` field gets stored on the user account and shown throughout the CRM.
3. (Optional) Promote this user to admin via Neon SQL Editor:
   ```sql
   UPDATE users SET role = 'admin' WHERE email = 'client@example.com';
   ```

## 6. Stripe (only if site sells)

1. Create the Stripe webhook **pointing directly at Render**: `https://<your-render-service>.onrender.com/api/stripe/webhook` (NOT via Vercel — Vercel's proxy mangles raw body for signature verification).
2. Subscribe to at least `checkout.session.completed`.
3. Copy the `whsec_...` signing secret into Render env vars (`STRIPE_WEBHOOK_SECRET`).
4. Uncomment the Stripe env-var slots in `render.yaml` and re-deploy.

## 7. Email — FormSubmit

The CRM's `/site-settings` form (where the client requests site updates) POSTs to `/api/site-changes`, which emails Teddy via FormSubmit. **Always from the frontend, never the backend** — Render free tier blocks SMTP, and Node `fetch` strips Origin/Referer.

FormSubmit activates per `(recipient, origin)` pair. First form submission sends an activation email to `teddy.nk28@gmail.com`. Click once → permanent.

## Gotchas (TIER-2 specific)

- **Two Vercel projects, one repo** — both projects must be linked to the *same* GitHub repo, with different Root Directories (`.` for marketing, `artifacts/crm` for CRM).
- **The `/crm/*` rewrite in the root vercel.json must point at the CRM's actual `.vercel.app` URL** — do step 3c after creating both projects, or the marketing site's Admin link will 404.
- **CORS** — `ALLOWED_ORIGINS` on Render must include BOTH Vercel URLs and BOTH custom-domain URLs. Missing one will cause CRM login to fail with a CORS error.
- **Vercel default output dir is `dist`** but the trades-template builds to `dist/public`. The CRM builds to its own `dist/public` too (via its `vite.config.ts`). Both `vercel.json` files override this.
- **Render auto-suffixes service names**. Always copy the actual `.onrender.com` URL from the dashboard before updating either `vercel.json`.
- **Neon UI masks password values** — copy/paste the connection string before navigating away.
- **FormSubmit "needs activation" returns HTTP 200**. Always inspect the JSON body for `success: "true"`, not just status code.
