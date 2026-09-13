# The SOFT CAT improvement loop

## Purpose

Make SOFT CAT .ai a distinctive, useful AI playground and a candid record of
building with AI. Give visitors something to try, something to understand and
a reason to return. The Horizon Map should earn trust through dated evidence.
The diary should show actual work, including failures and changes of mind.

The maintainer has authorised independent execution and publication. See
`AGENTS.md` for the current mandate. Routine editorial and engineering decisions
do not need another approval conversation.

## The prompt for each run

Continue improving `valorifutures/softcat.ai` and `https://softcat.ai`.

1. Read the saved checkpoint, current source and recent deployment results.
   If `active_branch` is non-null and `updated_at` is under 90 minutes old,
   another pass is active, even if its latest PR just merged. Do not start
   competing edits. Clear `active_branch` when handing over.
   Check open improvement PRs. If one has been actively updated in the past
   90 minutes, do not start competing work. Resume stale work deliberately,
   recording what happened. Never overwrite another contributor's changes.
2. Identify the most useful unfinished improvement. Prioritise broken journeys,
   inaccurate claims, accessibility, trustworthy data and clarity over novelty.
   The maintainer explicitly wants material that does not earn its place removed
   and useful additions made. Curate weak or misleading material, retaining a
   correction or audit record where it helps explain a meaningful change.
   A new experiment should do something interesting that visitors can use.
   Inspect new sourced thought drafts during the editorial pass. Keep a draft
   unpublished if its claims exceed its sources. Only documented work belongs
   in the field notebook. Reviewing a draft is within the maintenance mandate.
3. Define a small, complete outcome. Implement it on a focused branch. Use the
   existing Astro, Preact and Tailwind stack where it fits. Keep the site fast
   and resilient on GitHub Pages. Prefer an understandable solution.
4. Verify the change at the appropriate level. Run the production build and
   required data checks. Test real failure modes when changing automation.
   For visible changes inspect the rendered page, keyboard behaviour, narrow
   layouts, long content, empty states and relevant interactions.
5. Review the actual diff and current PR checks. Merge only passing work, let
   Pages publish it, and verify the deployed result. Recover from failures
   before beginning an unrelated feature. Keep work reversible in Git.
6. Update `IMPROVEMENT_STATE.json` and `docs/improvement-log.md` with what changed,
   validation, deployment evidence and the next concrete tasks. Continue into
   another useful batch while runtime permits. Always leave a safe checkpoint.

## Editorial judgement

- Preserve Valori's anonymous collective voice. Show expertise through the work.
- Use UK English, short paragraphs and precise claims. Follow `STYLE.md`.
- Distinguish tested results, sourced reports, opinion and forecasts.
- Verify current model availability, prices and benchmarks against primary
  sources. Missing data is unknown, not zero. Never invent a release or score.
- Preserve historical dates. Mark old material honestly. Reassess a forecast
  before changing its confidence or review date. Do not backfill a fake diary.
- Audit source chains. A bot's opinion about another bot's summary does not
  become independent evidence by appearing twice.
- Explain what runs locally and what sends data to another provider.
- Give automated experiments bounded inputs, clear outputs and visible failure
  states. The public diary should document the machinery as it actually works.

## Verification

```sh
npm ci
node scripts/validate-content.mjs
node scripts/validate-tools-data.mjs
node --test scripts/tests/*.test.mjs
node scripts/validate-horizon-refs.mjs
npm run build
python -m pytest bot/tests/ -q
```

Use an isolated Python environment with the packages listed by the PR workflow.
Do not invoke the live content bots as a test: they can call paid providers,
write history and push commits. Use fixtures and `--dry-run` only after checking
the specific script's behaviour.

## Operating boundaries

GitHub access covers code, PRs and deployment. The original daily bots run on a
separate systemd host. Source changes do not establish that the server is
reachable or that its timers are active. Record that uncertainty explicitly.

A recurring task resumes this process. It is not a permanently running agent.
Runtime availability and platform permissions still apply. Do useful work when
available and leave enough evidence that the next run can continue accurately.
Do not create artificial commits just to keep an automation alive.

## Current overnight window

The maintainer asked this run to continue until about 07:00 Europe/London on
13 September 2026, or 06:00 UTC. Check the clock between batches. Stop starting
new work at that deadline, leave in-flight work safe, and hand over the deployed
result. The hourly continuation has eight scheduled starts, from 23:15 on
12 September through 06:15 on 13 September, all in Europe/London time.
