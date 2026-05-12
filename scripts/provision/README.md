# scripts/provision/

API helper scripts called by `CLAUDE.md` to provision a new client site's infrastructure.

These run on **your local machine**, not on GitHub. Tokens are read from `~/.tier1-config/.env` — see `CLAUDE.md` section 10 for one-time setup.

## Scripts

| Script | What it does | Returns on stdout |
|---|---|---|
| `neon.sh <project-name>` | Creates a Neon Postgres project under Teddy's org | `DATABASE_URL` (with sslmode + channel_binding) |
| `render.sh <service> <database-url> <origins>` | Creates a Render web service from this repo's `render.yaml` | `https://<service>.onrender.com` |
| `vercel.sh <project> [domain] [root-directory]` | Creates a Vercel project linked to this repo's GitHub origin. Pass `artifacts/crm` as `root-directory` for the CRM project. | Production URL |
| `cloudflare.sh <domain> [extra-subdomains-csv]` | Adds apex + www CNAME records (gray cloud). Optional extra subdomains as comma-separated list (e.g. `crm` or `crm,blog`). | `https://<domain>` |

All scripts:
- Echo progress to **stderr** (so callers can capture clean stdout)
- Exit non-zero on failure with a clear error
- Are idempotent where possible (cloudflare.sh upserts; the others fail if a resource with the same name already exists)
- Back up generated secrets to `~/.tier1-config/{databases,services}/` (Neon connection strings, JWT/admin secrets)

## Requirements

- `bash` 4+, `curl`, `jq`, `openssl`
- A populated `~/.tier1-config/.env` (see `CLAUDE.md` section 10)
- For `render.sh` and `vercel.sh`: must be run from inside a git repo with `origin` pointing at the GitHub repo

## Manual invocation (for debugging)

```bash
# Test a token is valid first
source ~/.tier1-config/.env
curl -sS -H "Authorization: Bearer $NEON_API_KEY" https://console.neon.tech/api/v2/users/me | jq .

# Then call a script
./scripts/provision/neon.sh smoketest-prod
```

## Adding new platforms

If you add a new provider (Postmark, Fly.io, etc.), follow the pattern:

1. Add the token slot to `CLAUDE.md` section 10
2. Add a script here that sources `lib.sh`, calls `require_env_file` + `require_var`, makes the API call, prints progress to stderr, returns the useful identifier on stdout
