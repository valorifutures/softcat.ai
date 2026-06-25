# /feral — setup

An autonomous corner of softcat.ai. No human brief. A three-agent council
(Director, Builder, Critic) decides what `/feral` is and rebuilds it twice a
week. You designed the cage; they own everything inside it. A test bed for
agent autonomy.

## What's in here

```
feral/CONSTITUTION.md          the cage — floor, walls, liberation, duties
feral/RUBRIC.md                the gate's safety+deploy rubric + ledger schema
.claude/agents/feral-*.md      the council: director, builder, critic
.claude/commands/feral-cycle.md  one full loop iteration (a slash command)
src/pages/feral/index.astro    the bare front door (lists creations + ledger)
src/content/feral/manifest.json  registry of creations (agents append)
src/content/feral/ledger.json    run log / state (agents append; rendered live)
scripts/feral-gate.mjs         the hard wall: scope check + critic verdict
scripts/feral-run.sh           run one cycle locally, by hand
.github/workflows/feral.yml    twice-weekly heartbeat + propose/ship dial
```

## Drop it in

Copy these paths into your softcat.ai repo root, preserving structure. Nothing
here touches your existing files, config, or other pages — `/feral` is fully
walled off. Then:

```bash
chmod +x scripts/feral-run.sh
git add . && git commit -m "feral: scaffold"
```

## The build order (don't skip ahead)

Straight from the loops article: prove one run by hand, harden, *then* automate.

1. **One manual run.** With Claude Code installed and signed in:
   ```bash
   ./scripts/feral-run.sh
   ```
   Watch the council decide, build, and gate. Inspect the branch it leaves.
   Run it a few times. Confirm the gate actually blocks anything outside the
   walls (try telling the builder to edit your homepage — it should fail).

2. **Turn on the heartbeat in PROPOSE.** Add `ANTHROPIC_API_KEY` to the repo
   secrets. The workflow is already set to `propose`: twice a week it opens a PR
   with the gate green. You one-click merge. You never edit and never judge taste
   — you're a rubber stamp as long as the gate passes — but a human still stands
   between the agents and the live site.

3. **Flip to SHIP when you trust it.** Change the workflow's `FERAL_MODE`
   default from `propose` to `ship`. Now green gate → auto-merge → live, no human.
   Pure autonomy. Same pipeline, one-line change.

## The dial, plainly

- **propose** — content autonomy is total; a human merges. Safe default.
- **ship** — no human in the loop at all. The real experiment.

## The two limits (neither is creative)

- **Scope, not capability.** The council can build *anything* that runs in a
  browser, but only inside `src/pages/feral/`, `src/content/feral/`,
  `public/feral/`. The gate enforces this mechanically.
- **Static host.** No backend. Commerce and persistence go through client-side
  embeds/APIs, not a server. Everything client-side is unlimited.

Taste is never a limit. Ugly ships. Weird ships. Off-brand ships. That's the
point.
