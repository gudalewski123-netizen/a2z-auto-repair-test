# SETUP — fork this template into a new client site

This template is wired up for **near-zero manual setup**. Follow these steps for a new client.

Total time: **~10 minutes** (vs ~30 min without the integration files).

---

## Prerequisites
- Client domain registered + on Cloudflare (or you can buy/transfer it during setup)
- Your `~/Claude/cowork-handoff/PLATFORM_API_TOKENS.txt` available (Vercel, Render, Neon, Cloudflare, GitHub)
- ~10 minutes of focused time

---

## 1. Fork on GitHub (1 min)

Either via the GitHub UI, or via API:
```bash
curl -H "Authorization: token $GITHUB_PAT" \
  -d '{"name":"<client-slug>","private":true}' \
  https://api.github.com/user/repos
git clone https://github.com/teddyk28/TIER-2-TEMPLATE.git <client-slug>
cd <client-slug>
git remote set-url origin https://github.com/teddyk28/<client-slug>.git
git push origin main
```

## 2. Create Neon project for this client (1 min)

```bash
curl -X POST https://console.neon.tech/api/v2/projects \
  -H "Authorization: Bearer $NEON_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"project":{"name":"<client-slug>-prod","region_id":"aws-us-east-1"}}'
```
Copy the `connection_uri` from the response — that's the new client's `DATABASE_URL`.

## 3. Edit `render.yaml` (30 sec)

Open `render.yaml` and rename `services[0].name` from `tier2-template-api` to `<client-slug>-api`. Commit + push.

## 4. Create Render Blueprint (2 min)

- Go to https://dashboard.render.com/blueprints
- Click "New Blueprint Instance"
- Connect GitHub → pick the forked repo
- Render auto-detects `render.yaml`
- Fill in the prompted secrets:
  - `DATABASE_URL` = the Neon URL from step 2
  - `ALLOWED_ORIGINS` = `https://<clientdomain>.com,https://www.<clientdomain>.com`
- Save → Render builds + deploys in ~3 min

Note the Render service URL (e.g., `https://<client-slug>-api-xxxx.onrender.com`).

## 5. Edit `artifacts/trades-template/vercel.json` (30 sec)

Replace `REPLACE_WITH_RENDER_URL` with the actual Render URL from step 4. Commit + push.

## 6. Create Vercel project (1 min)

```bash
curl -X POST https://api.vercel.com/v10/projects \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "<client-slug>",
    "framework": "vite",
    "rootDirectory": "artifacts/trades-template",
    "outputDirectory": "dist/public",
    "gitRepository": { "type": "github", "repo": "teddyk28/<client-slug>" }
  }'
```
Vercel detects `vercel.json` and deploys.

## 7. Add Cloudflare DNS (1 min)

For both apex and www:
```bash
curl -X POST https://api.cloudflare.com/client/v4/zones/<zone-id>/dns_records \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -d '{"type":"CNAME","name":"<clientdomain>.com","content":"vercel-dns-017.com","proxied":false}'
```

## 8. Add the domain to Vercel (30 sec)

```bash
curl -X POST https://api.vercel.com/v10/projects/<project-id>/domains \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -d '{"name":"<clientdomain>.com"}'
```

## 9. Verify (1 min)

- `curl https://<clientdomain>.com/api/healthz` should return `{"status":"ok"}`
- Submit a test lead via the form
- Log in to `/admin` with the auto-generated `ADMIN_PASSWORD` (find it in Render dashboard → Environment)

## 10. Hand off

Update the new repo's `CLAUDE.md` with the live URLs + admin credentials. Send the client the admin password.

---

## What if something fails?

- Render build fails → check the build log; the most common cause is a missing baseline patch (already applied here, shouldn't happen)
- Vercel API proxy 404s → check `vercel.json` was edited with the actual Render URL
- DNS won't resolve → Cloudflare proxy should be DISABLED (gray cloud); SSL takes ~5 min to provision after DNS propagates
- Admin login fails → password is in Render dashboard → Environment → ADMIN_PASSWORD (eye icon to reveal)

For deeper troubleshooting, see the gotchas list in `CLAUDE.md`.

---

## Tier 2-specific: TWO frontends

Tier 2 has both a marketing site AND a CRM admin dashboard. You'll create TWO Vercel projects:

1. **Marketing site** — `rootDirectory: artifacts/trades-template` → `clientdomain.com`
2. **CRM dashboard** — `rootDirectory: artifacts/crm` → `crm.clientdomain.com`

Both share the same Render backend. Add a second `vercel.json` at `artifacts/crm/vercel.json` with the same proxy config pointing to the same Render service.

Cloudflare DNS gets 2 sets of records (apex + www for the marketing site, just `crm.` for the dashboard).

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
