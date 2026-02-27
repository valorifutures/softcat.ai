# CLAUDE.md — SOFT CAT .ai Worker Context

## What This Site Is

SOFT CAT .ai (softcat.ai) is a neon cyberpunk AI site built with Astro 5.17 + Preact + Tailwind 4.2.
It deploys via GitHub Actions to GitHub Pages on every push to `main`.
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
- **Colors**: void (#0a0a0f), surface (#12121a), surface-light (#1a1a2e), neon-green (#00ff9f), neon-cyan (#00d4ff), neon-purple (#b44aff), neon-amber (#ffb800)
- **Fonts**: Inter (sans), JetBrains Mono (mono). Mono used for headings and UI elements.
- **Build**: `npm run build` outputs to `dist/`. Must pass before any PR.

## Content Architecture

- `src/content/news-and-updates/` — markdown with frontmatter: title, date, tags[], summary, draft
- `src/content/thoughts/` — markdown with frontmatter: title, date, tags[], summary, draft, pinned
- `src/content/tools/` — markdown with frontmatter: title, description, url?, labUrl?, status (active/experimental/archived), tags[], draft
- `src/data/models.json` — array of AI model specs (pricing, context, capabilities)
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
- `src/components/lab/` — Preact TSX components for interactive lab tools
- `src/pages/lab/` — lab tool pages (each wraps a Preact component)

## Design Conventions

- Cards: `bg-surface border border-surface-light rounded-lg p-5 card-glow`
- Headings: `font-mono text-text-bright` with glow classes (`glow-green`, `glow-cyan`, `glow-purple`)
- Links: `text-neon-cyan hover:underline`
- Tags: `px-1.5 py-0.5 bg-surface-light rounded text-xs font-mono text-text-muted`
- Section accents: green (news), cyan (thoughts), purple (tools), amber (models)
- All lab tools are 100% client-side (no server calls)

## Existing Pages

- `/` — homepage with hero, about, section previews
- `/news-and-updates` — AI news digest posts
- `/thoughts` — opinion pieces
- `/tools` — tool writeups
- `/lab` — 7 interactive tools (token counter, prompt builder, markdown preview, model comparison, prompt workbench, chat playground, model explorer)
- `/spawn` — hosted agent builder GUI
- `/request` — agent request form
- `/now` — what we're working on
- `/status` — system health
- `/valori` — about the team

## Safety Rules

1. NEVER push directly to main. Always create a branch and PR.
2. ALWAYS run `npm run build` and verify it exits 0 before committing.
3. NEVER modify: `service/`, `bot/`, `.github/workflows/deploy.yml`, `package.json`, `package-lock.json`, `.env` files.
4. NEVER add npm dependencies. Work with what's already installed.
5. NEVER delete existing content or pages.
6. Keep PRs focused. One issue = one PR. Small, reviewable changes.
7. Content must follow STYLE.md exactly. Read it before writing.
