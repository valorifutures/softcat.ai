# CLAUDE.md — SOFT CAT .ai Worker Context

## What This Site Is

SOFT CAT .ai (softcat.ai) is a living demonstration of automated AI infrastructure in production.
Six bots build the site daily. The content is the output. The real story is the machinery.
Built with Astro 5.17 + Preact + Tailwind 4.2. Dark premium aesthetic.
Deploys via GitHub Actions to GitHub Pages on every push to `main`.
The domain is softcat.ai. The GitHub repo is valorifutures/softcat.ai.

## Identity

- Maintained by "Valori", an anonymous collective. Always "we", never "I".
- Read STYLE.md before writing ANY content. It is mandatory.
- No em dashes. No semicolons (except in code). No corporate buzzwords.
- Short paragraphs (2-3 sentences). Lead with the point.

## Tech Stack

- **Framework**: Astro 5.17 (static site generator)
- **UI**: Preact components (`.tsx`) for interactive bits, Astro components (`.astro`) for everything else
- **Styling**: Tailwind CSS 4.2 via Vite plugin. Theme defined in `src/styles/global.css`.
- **Colors**: void (#0c0c14), surface (#14141e), surface-light (#1e1e30), neon-green (#4ecb8f), neon-cyan (#5ab8d4), neon-purple (#9b7acc), neon-amber (#d4a54a), neon-red (#da5e74)
- **Fonts**: Inter (sans), JetBrains Mono (mono). Mono used for headings and UI elements.
- **Build**: `npm run build` outputs to `dist/`. Must pass before any PR.

## Content Architecture

- `src/content/news-and-updates/` — markdown with frontmatter: title, date, tags[], summary, draft
- `src/content/thoughts/` — markdown with frontmatter: title, date, tags[], summary, draft, pinned
- `src/content/tools/` — markdown with frontmatter: title, description, date, last_verified?, url?, labUrl?, status (active/experimental/archived), tags[], draft
- `src/data/models.json` — array of AI model specs (pricing, context, capabilities). **This file IS the model roster**: model_bot Job 1 refreshes prices/specs for whatever ids it contains; new models enter ONLY via Job 2's radar-gated proposal PRs (branch `model-bot/roster-proposals`, one open PR updated in place, placeholder scores edited during review). Validate with `node scripts/validate-tools-data.mjs` (also runs in PR CI with `bot/tests/` pytest).
- Collections defined in `src/content.config.ts`

## Content File Naming

- News: `YYYY-MM-DD-slug.md` (e.g., `2026-02-27-ai-digest.md`)
- Thoughts: `YYYY-MM-DD-slug.md`
- Tools: `YYYY-MM-DD-tool-name.md` or `tool-name.md`

## Page Structure

- `src/pages/` — Astro pages. Dynamic routes use `[...slug].astro`.
- `src/layouts/BaseLayout.astro` — wraps every page (Header + Footer + slot)
- `src/layouts/PostLayout.astro` — wraps blog-style content
- `src/components/` — shared Astro components
- `src/components/lab/` — Preact TSX components for interactive tools
- `src/pages/lab/` — interactive tool pages (each wraps a Preact component, back-link to `/tools`)

## Design Conventions

- Cards: `bg-surface border border-surface-light rounded-lg p-5 card-glow`
- Headings: `font-mono text-text-bright` with glow classes (`glow-green`, `glow-cyan`, `glow-purple`)
- Links: `text-neon-cyan hover:underline`
- Tags: `px-1.5 py-0.5 bg-surface-light rounded text-xs font-mono text-text-muted`
- Section accents: green (news), cyan (thoughts), purple (tools), amber (models)
- All lab tools are 100% client-side (no server calls)

## Existing Pages

- `/` — homepage with hero, activity ticker, about, section previews
- `/news-and-updates` — AI news digest posts (bot-generated daily)
- `/thoughts` — opinion pieces (bot-generated daily)
- `/tools` — merged tools page: provenance strip (staleness register), weekly-rotating featured spotlight (`featured: true` in tools-manifest.json pins as editorial override), interactive tools (Preact apps at `/lab/*`, data-driven ones show model-data stamps) + dated tool write-ups with tag filter and archive section. `/lab` redirects here. Design doc: `docs/designs/tools-page-showroom.md`
- `/radar` — daily AI product launches (bot-generated)
- `/prompts` — copy-ready AI prompts (bot-generated weekly)
- `/pipeline` — the machinery dashboard: bot roster, run history, costs, feed sources
- `/now` — redirects to /pipeline
- `/status` — redirects to /pipeline
- `/valori` — about the team

## Pipeline Architecture

- `src/data/pipeline/bots.json` — bot manifest (name, schedule, feeds, model, accent)
- `src/data/pipeline/runs.json` — append-only run log (populated by bots via `bot/pipeline_log.py`)
- Bots log every run: duration, feeds scanned, items found/rejected/published, model, cost, output files. Multi-job bots pass `job=` to log_run (model_bot: prices/roster; tool_bot: weekly write-up + verify) — never register new bot ids, the "six bots" copy depends on it
- tool_bot Job 2 (Sundays, after the write-up): checks every write-up url, HTTP status only. Archive needs 3 consecutive definitive-dead weeks (404/410/DNS/refused); 403/429/timeout = unverifiable (staged to ~/.softcat-bot-staging + Discord), never auto-archived. Streaks in `bot/tool_verify_history.json`
- Pipeline page and activity ticker read runs.json at build time
- Content frontmatter supports optional pipeline metadata: `generated_by`, `model`, `generation_time_s`, `cost_usd`

## Horizon Map (`/horizon`)

- Data lives in `src/data/horizon/*.json` (lanes: `past`, `now`, `now-archive`, `next`, plus `debates`, `scenarios`, `shifts`). Per-entry shape is enforced by Zod in `src/content.config.ts`; cross-file integrity (id uniqueness, dangling refs, confidence freshness) by `scripts/validate-horizon-refs.mjs`.
- **Review surface — bot proposes, Valori lands (TODOS #5, decided):**
  - `bot/horizon_bot.py` Job 1 writes Now-lane proposals to `now.json` on a dated `horizon-bot/proposals-YYYY-MM-DD` branch and opens a **PR**. Valori reviews the data diff and merges to land. The bot never writes `now.json` on `main` directly.
  - Job 2 (Next confidence shifts) and Job 3 (Past promotion candidates) are **flag-only** — they go to `~/.softcat-bot-staging/horizon-bot-proposals.json` for manual review, not a PR.
  - `past.json` is single-writer (Valori only). `debates.json` is 100% human-curated.
- The validator is run manually / via CI, not as part of `astro build`. Run it before merging horizon data PRs: `node scripts/validate-horizon-refs.mjs`.

## Safety Rules

1. NEVER push directly to main. Always create a branch and PR.
2. ALWAYS run `npm run build` and verify it exits 0 before committing.
3. NEVER modify: `.github/workflows/deploy.yml`, `package.json`, `package-lock.json`, `.env` files.
4. NEVER add npm dependencies. Work with what's already installed.
5. NEVER delete existing content or pages without explicit approval.
6. Keep PRs focused. One issue = one PR. Small, reviewable changes.
7. Content must follow STYLE.md exactly. Read it before writing.
