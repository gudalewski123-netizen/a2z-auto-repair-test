# TEDDY-SETUP.md — One-Time Setup for the TIER1 Automation

Read this once. Takes ~15 minutes. After this, you can spin up a new client site by opening Claude Code inside a fresh clone of this template and describing the client — Claude reads `CLAUDE.md` automatically and handles the rest.

This document is for **Teddy** (or anyone setting up a fresh laptop). The user (Greg / `gudalewski123-netizen`) already has this set up; he only needs to repeat steps 5 and 6 when his tokens rotate.

---

## What you'll have when you're done

- `~/.tier1-config/.env` with all 5 API tokens (Vercel, Neon, Render, Cloudflare, GitHub)
- Claude Code installed and authenticated
- Ability to run: `gh repo create teddyk28/<name> --template teddyk28/TIER1REMIXONLYTemplate --private --clone && cd <name> && claude` — Claude takes it from there

---

## Step 1: install command-line tools

```bash
# On macOS:
brew install gh jq curl
# bash 3.2 (default macOS) works fine; no need to upgrade
```

Verify:
```bash
gh --version && jq --version && curl --version | head -1
```

## Step 2: authenticate GitHub CLI

```bash
gh auth login
# pick GitHub.com → HTTPS → "Login with a web browser"
# follow the prompts
```

When prompted for scopes, accept the defaults (`gist`, `read:org`, `repo`). After login:
```bash
gh auth status   # should show: Logged in to github.com account teddyk28
```

## Step 3: install Claude Code

Follow the instructions at [claude.com/claude-code](https://claude.com/claude-code) for your platform. After install:
```bash
claude --version
```

## Step 4: get the 5 API tokens

For each platform, generate a token with the scopes listed. **Don't paste the token values into chat with Claude or anyone else** — they go straight into the env file in step 5.

### Vercel
1. Open https://vercel.com/account/tokens
2. Click **Create Token**
3. Name: `tier1-template-automation`
4. Scope: **Full Account** (or the team `the-tradestacks-projects` if available)
5. Expiration: **No Expiration** (or 1 year if you'd rather rotate)
6. Token will start with `vcp_`. (Don't confuse with `vck_` — that's AI Gateway.)

### Neon
1. Open https://console.neon.tech → your avatar (top right) → **Account Settings** → **API keys**
2. Click **Generate new API key**
3. Name: `tier1-template-automation`
4. Token starts with `napi_`

### Render
1. Open https://dashboard.render.com → your avatar (top right) → **Account Settings** → **API Keys**
2. Click **Create API Key**
3. Name: `tier1-template-automation`
4. Token starts with `rnd_`

### Cloudflare
1. Open https://dash.cloudflare.com → your avatar (top right) → **My Profile** → **API Tokens**
2. Click **Create Token** → use the **Edit zone DNS** template
3. Permissions: `Zone:DNS:Edit` for the zones you'll use for clients
4. (No fixed prefix — just a 40-char alphanumeric string, or `cfut_...` for newer accounts)

### GitHub PAT (fine-grained)
1. Open https://github.com/settings/personal-access-tokens
2. Click **Generate new token** → **Fine-grained token**
3. **Token name**: `tier1-template-automation`
4. **Expiration**: 12 months (or "No expiration" if you trust your laptop)
5. **Resource owner**: `teddyk28`
6. **Repository access**: **All repositories** (so it can create new repos under `teddyk28/*`)
7. **Permissions** — set the following to **Read and write**:
   - **Administration** (lets the token create new repos)
   - **Contents**
   - **Pull requests**
   - **Workflows**
   - **Secrets** (optional, only if you'll set repo secrets via API later)
8. Click **Generate token**. Token starts with `github_pat_11...`
9. Copy immediately — GitHub only shows it once.

**Sharing this PAT with Greg**: if you want Greg (`gudalewski123-netizen`) to be able to create repos under `teddyk28` from his laptop, share this PAT with him through a password manager (1Password, Bitwarden) — never email/text/chat. He'll add it to his own `~/.tier1-config/.env`.

## Step 5: create `~/.tier1-config/.env` on your machine

```bash
mkdir -p ~/.tier1-config
chmod 700 ~/.tier1-config

# Open the file in your editor:
nano ~/.tier1-config/.env
# or: code ~/.tier1-config/.env  / vim ~/.tier1-config/.env
```

Paste this content, then fill in each token from step 4:

```bash
# Vercel — https://vercel.com/account/tokens (starts with vcp_)
VERCEL_TOKEN=
VERCEL_TEAM_ID=team_JJsO6rfcfguriDOKqCttwD4U

# Neon — console.neon.tech → Account Settings → API keys (starts with napi_)
NEON_API_KEY=
NEON_ORG_ID=org-broad-shape-85063972

# Render — dashboard.render.com → Account Settings → API Keys (starts with rnd_)
RENDER_API_KEY=
RENDER_OWNER_ID=tea-d7ul88lckfvc73bbmph0

# Cloudflare — dash.cloudflare.com → My Profile → API Tokens
CLOUDFLARE_API_TOKEN=

# GitHub PAT — fine-grained, teddyk28-owner, with Administration:write
GITHUB_PAT=
```

After saving:
```bash
chmod 600 ~/.tier1-config/.env
```

## Step 6: smoke-test the setup

Quick verification that all 5 tokens work without creating any real resources:

```bash
# Source the env file
source ~/.tier1-config/.env

# Vercel — should print your email
curl -s -H "Authorization: Bearer $VERCEL_TOKEN" https://api.vercel.com/v2/user | jq -r '.user.email'

# Neon — should print your email
curl -s -H "Authorization: Bearer $NEON_API_KEY" https://console.neon.tech/api/v2/users/me | jq -r '.email'

# Render — should list 1+ workspace
curl -s -H "Authorization: Bearer $RENDER_API_KEY" https://api.render.com/v1/owners | jq -r '.[].owner.name'

# Cloudflare — should print "active"
curl -s -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" https://api.cloudflare.com/client/v4/user/tokens/verify | jq -r '.result.status'

# GitHub PAT — should print your username
curl -s -H "Authorization: Bearer $GITHUB_PAT" https://api.github.com/user | jq -r '.login'
```

Any token that errors out: regenerate it and re-verify. **Don't proceed until all 5 print clean values.**

## Step 7: spin up a real client site

```bash
# Create a new repo from the template
gh repo create teddyk28/acme-roofing \
  --template teddyk28/TIER1REMIXONLYTemplate \
  --private \
  --clone

cd acme-roofing

# Wait ~10s for GitHub to copy template contents, then open Claude
sleep 10
claude
```

When Claude opens, the first thing it does is read `CLAUDE.md`. It will say:

> "I see this is a fresh clone of TIER1 (the repo isn't named `TIER1REMIXONLYTemplate`). What client is this for? Tell me business name, trade, location, phone, and your domain (if you have one), and I'll customize and deploy."

Tell Claude about the client. It will:
1. Ask follow-up questions for anything missing
2. Edit `artifacts/trades-template/src/config.ts` with the new info
3. Run the provision scripts (Neon → Render → Vercel → Cloudflare)
4. Commit + push
5. Report the live URL

Total time: ~10 minutes (mostly waiting for Render's first build).

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `ERROR: ~/.tier1-config/.env not found` | Step 5 not done | Run step 5 |
| `repo '...' is not under teddyk28` | Trying to provision against a repo under another account | Recreate the repo under `teddyk28` |
| `passed in repository URL is invalid or unfetchable` (from Render) | Render's GitHub App doesn't see the repo | Confirm the repo is `teddyk28/*` and is private (Render's GitHub App needs explicit access) |
| `HTTP 401` from any API | Token expired or wrong | Regenerate that token (step 4), update env file (step 5) |
| `HTTP 403: Must have admin rights` from `gh repo delete` | Token lacks `delete_repo` scope | `gh auth refresh -h github.com -s delete_repo` |
| Vercel build fails with `PORT environment variable is required` | `vercel.json` was edited and lost the `buildCommand` env vars | Re-add `PORT=3000 BASE_PATH=/` in front of `pnpm --filter @workspace/trades-template build` |

## Token rotation

When tokens expire (some are 6-12 months, some never):

1. Generate fresh token from the platform (step 4)
2. Edit `~/.tier1-config/.env` and replace the old value (step 5)
3. Re-run step 6 to verify

The old tokens stop working immediately. No code changes needed.

## Sharing with Greg

When Greg sets up a fresh laptop, he repeats steps 1-3, then asks you (via password manager) for the GitHub PAT from step 4 (he generates his own Vercel/Neon/Render/Cloudflare tokens since his accounts are linked to your team/org as a member or owner). He then does step 5 with his own values and step 6 to verify.

The GitHub PAT is the only one that has to come from you — because it needs to be issued by the `teddyk28` account to grant repo-creation permission under `teddyk28/*`.
