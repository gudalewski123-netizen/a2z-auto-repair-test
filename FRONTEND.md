# FRONTEND.md — Design + Screenshot Workflow

## Always Do First
- Read this file before writing ANY frontend code. Every session, no exceptions.
- Read `brand_assets/` next. If anything is in there, use it instead of placeholders.

## Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch using the guardrails below.
- Screenshot your output → compare against reference → fix mismatches → re-screenshot. At least 2 rounds. Stop only when no visible differences remain or user says so.

## Local Server (Vite)
- This template is a Vite + React app at `artifacts/trades-template/`.
- Start the dev server in the background: `pnpm --filter trades-template dev`
- Default URL: `http://localhost:5173`
- NEVER screenshot a `file:///` URL.
- If the server is already running, do not start a second instance.

## Screenshot Workflow
- Puppeteer is installed as a dev dep at the repo root. Chrome cache lives at `~/.cache/puppeteer/`.
- Screenshot the running site: `node screenshot.mjs http://localhost:5173`
- Auto-saves to `./temporary screenshots/screenshot-N.png` (incremented, never overwritten).
- Optional label: `node screenshot.mjs http://localhost:5173 hero` → `screenshot-N-hero.png`
- After screenshotting, read the PNG from `temporary screenshots/` with the Read tool — Claude can see and analyze it directly.
- Be specific when comparing: "heading is 32px but reference shows ~24px", "card gap is 16px but should be 24px".
- Check: spacing/padding, font sizes/weights/line-height, exact hex colors, alignment, border-radius, shadows, image sizing.

## Business Info — Single Source of Truth
- `business.config.json` at repo root is the ONE place business identity lives (name, email, phone, address, trade, domain).
- Frontend reads it via `artifacts/trades-template/src/config.ts` (imported as JSON).
- Backend reads its values via env vars set on Render.
- When deploying a new client:
  1. Edit `business.config.json`
  2. Run `node scripts/sync-business-info.mjs` — this updates `src/config.ts` BUSINESS fields and prints the env vars to paste into Render
  3. Paste those env vars into Render dashboard → service → Environment
  4. Redeploy

## Brand Assets
- Always check the `brand_assets/` folder before designing. It may contain logos, color palettes, photos, or style notes.
- If a logo is present, use it. If a color palette is defined, use those exact hex values — do not invent brand colors.

## Output Defaults
- All frontend code lives in `artifacts/trades-template/src/`.
- Tailwind v4 is already configured. Do not add Tailwind via CDN.
- Placeholders: trade-themed photos auto-load from `src/placeholders.ts`. Fallback to `https://placehold.co/WIDTHxHEIGHT`.
- Mobile-first responsive.

## Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette (indigo-500, blue-600, etc.). Pick a custom brand color and derive shades from it.
- **Shadows:** Never use flat `shadow-md`. Use layered, color-tinted shadows with low opacity.
- **Typography:** Never the same font for headings and body. Pair a display/serif with a clean sans. Tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states.
- **Images:** Add a gradient overlay (`bg-gradient-to-t from-black/60`) and a color treatment layer with `mix-blend-multiply`.
- **Spacing:** Use intentional, consistent spacing tokens — not random Tailwind steps.
- **Depth:** Surfaces should layer (base → elevated → floating), not all sit at the same z-plane.

## Hard Rules
- Do not add sections, features, or content not in the reference
- Do not "improve" a reference design — match it
- Do not stop after one screenshot pass
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary color
