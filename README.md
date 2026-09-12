# SOFT CAT .ai

An independent AI playground, engineering diary and Horizon Map by Valori.
Try tools, inspect experiments and follow the work behind a site built with AI.

**Live site:** https://softcat.ai
**Repository:** https://github.com/valorifutures/softcat.ai

Built with Astro, Preact and Tailwind. Static output is published through GitHub
Actions to GitHub Pages. Some browser tools connect directly to an external AI
provider using a visitor's own key. The daily publishing bots historically run
on a separate systemd host. Feral has its own GitHub Actions workflow.

## Development

```sh
npm ci
npm run dev
```

Run `npm run build` for production output in `dist/`. Run `npm run preview` to
inspect that output. See `IMPROVEMENT_LOOP.md` for checks and operating practice.

## Where things live

| Path | Purpose |
|---|---|
| `src/pages/` | Pages and routes |
| `src/components/lab/` | Interactive Preact tools |
| `src/content/` | News, thoughts, prompts, tool write-ups and experiments |
| `src/data/horizon/` | Timeline, evidence, forecasts and debates |
| `src/data/pipeline/` | Bot definitions and recorded runs |
| `bot/` | Publishing scripts and regression tests |
| `scripts/` | Build, content and data checks |
| `feral/` | Autonomous experiment constitution and operating notes |

## Ongoing improvement

Start with `AGENTS.md`, `IMPROVEMENT_LOOP.md`, `IMPROVEMENT_STATE.json` and
`STYLE.md`. The implementation record is in `docs/improvement-log.md`.

SOFT CAT .ai is an independent project. It is not affiliated with Softcat plc.
