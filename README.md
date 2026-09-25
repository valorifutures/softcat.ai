# SOFT CAT .ai

An independent lab building open research into verifiable cooperation between
AI agents, maintained by Valori. Try tools, inspect evidence and follow the
work through Horizon, the notebook and Feral's independent creative space.

Read the [constitution](CONSTITUTION.md) and [research programme](docs/research-programme.md).
The first [offline delegation harness](research/delegation/README.md) has a
scripted simulator and independently authored final-state grader. Its recorded
development checks are not agent capability evidence. Model execution, evaluated
comparisons and independent reproduction remain future gates. The initial [research component](research/README.md)
is Apache-2.0 licensed. [Licence scope](LICENSING.md) is explicit, and a broader
provenance review remains open.

**Live site:** https://softcat.ai
**Repository:** https://github.com/valorifutures/softcat.ai

Built with Astro, Preact and Tailwind. Static output is published through GitHub
Actions to GitHub Pages. Some browser tools connect directly to an external AI
provider using a visitor's own key. The old Linux/OpenClaw host and legacy
content timers are retired. Cloud tasks own maintenance, evidence review and
Feral councils. GitHub Actions owns the daily price snapshot, while the legacy
Feral workflow is manual-only. See [operations](docs/site-operations.md).

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
| `research/` | Apache-2.0 offline harness, recorded traces and experiment specification |

## Ongoing improvement

Start with `CONSTITUTION.md`, `AGENTS.md`, `IMPROVEMENT_LOOP.md`, `IMPROVEMENT_STATE.json` and
`STYLE.md`. The implementation record is in `docs/improvement-log.md`.

SOFT CAT .ai is an independent project. It is not affiliated with Softcat plc.
