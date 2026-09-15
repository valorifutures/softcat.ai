# Feral operation

Feral is the autonomous corner of softcat.ai. The director chooses the work,
the builder makes it, and a separate critic checks safety and deployment.
The constitution and rubric apply to every runner.

## Current schedule

The cloud **Feral council** task runs on Tuesday and Friday afternoons in
Europe/London, around 15:00 with a flexible start window. It was enabled on
15 September 2026, with the first scheduled start on 18 September. It uses
independent Codex collaboration agents in the director, builder and critic
roles. It needs the connected GitHub app, not the retired Linux/OpenClaw host
or an Anthropic key supplied to that host.

The task reads current main, checks for another active run or candidate, then
runs exactly one council cycle. A cycle already shipped that day prevents a
duplicate. The public ledger records actual outcomes. The configured schedule
alone does not prove that a run happened.

See [site operations](../docs/site-operations.md) for the wider schedule and
publication process. The old GitHub cron has been removed to avoid generating
the same cycle through two schedulers. Its manual runner remains available.

## Council and publication

1. Read the constitution, rubric, manifest and ledger. Verify a clean baseline.
2. Delegate direction, building and criticism to separate agents using the
   role files in `.claude/agents/`. Never let the maker supply its own PASS.
3. Append exactly one ledger record with the current UTC date, preserving all
   earlier records. Include the actual provider/orchestration and honest review.
4. Keep the complete cycle diff inside `src/pages/feral/`,
   `src/content/feral/` and `public/feral/`. Maintenance/configuration changes
   belong in a separate branch and PR.
5. Run the trusted base version of `scripts/feral-gate.mjs` against the base and
   candidate commits, all required checks, the build and publication audit.
6. Publish through a reviewed PR only after required hosted checks pass.
   Concurrent changes to main require fresh validation. Verify Pages and the
   actual creation afterwards. A failed candidate is retained, not shipped.

The critic judges safety and deploy only. The director's taste is not subject
to approval. Up to three build/review attempts may fix safety or deployment
failures. After the third FAIL, stop and ship nothing.

## Optional Claude Code runner

`.claude/commands/feral-cycle.md` and `scripts/feral-run.sh` retain the original
Claude Code entry point. A maintainer can run `./scripts/feral-run.sh` in a
clean checkout with Claude Code installed and signed in. It leaves a candidate
for inspection. Do not run it while the cloud task or another cycle is active.

`.github/workflows/feral.yml` is now manual-only. It needs the repository's
`ANTHROPIC_API_KEY` secret and offers two modes:

- `propose` is the default. Build and gate the candidate, then open a PR.
- `ship` also advances main if it remains a fast-forward and deploys the
  exact checked Pages artifact. Publication can be blocked by repository
  permissions, rules or concurrent changes. Never bypass those checks.

Generation and validation have no repository write permission. Publishing runs
separately and never executes generated source. The 15 September scheduled
Action passed council and validation but failed publishing. Its job log was
unavailable through the connected API, so the specific cause is unconfirmed.
The new cloud task uses the ordinary checked PR/merge route instead.
