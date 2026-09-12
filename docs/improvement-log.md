# Improvement log

## 12 September 2026: publishing recovery

The last successful Pages deployment was on 1 July at 07:00 UTC, commit
`8efe99c`. The next prompt-library commit introduced a stray Markdown wrapper
inside YAML frontmatter. The latest Pages failure and the 1 September Feral
failure both identify that same file. Repository content continued to 3 July.

The recovery removes the misplaced wrappers, parses generated prompt files
individually, rejects truncated or malformed batches, validates actual YAML
before publication and adds a content check to PR and deployment workflows.
It also establishes the recurring improvement brief and checkpoint.

Validation: all 406 Markdown files parse, all 82 bot tests pass, and the
production build produces 877 pages. Model data validation passes. The Horizon
validator has no errors and reports 15 genuinely overdue forecast reviews.
PR #194 passed CI and merged. Pages deployment 34719831328 succeeded at 21:24 UTC. The repaired prompt page was verified on the live site.

## 12 September 2026: trust and freshness

Old bot successes previously appeared operational because their relative times
and health labels were frozen at build time. Activity now uses absolute UTC
records with browser-updated ages. The pipeline shows a dated seven-day
snapshot and explicitly distinguishes server activity from site publication.
Missing costs stay unrecorded. Configured schedules use Europe/London.

Model tools disclose the last successful pricing job, excluding roster jobs.
The Horizon map exposes its actual evidence dates without pretending a build
constitutes a review. Privacy copy covers OpenRouter, optional key storage,
Google Fonts, Buttondown, hosting and the configured analytics beacon.
Chat keys stay in page memory unless a visitor chooses to remember them.

Validation: six timestamp and job-selection regression tests pass. Content,
model data and Horizon validation have no errors. The production build passes
with 877 pages. All 15 old Horizon reviews remain visible warnings. PR #195 passed CI and merged. Pages deployment 34720708838 succeeded. Live
inspection confirmed absolute dates, refreshed ages and explicit stale records.

## 12 September 2026: workshop, notebook and agent check

The homepage now leads with usable experiments, the build diary and routes
into Horizon and Feral. It removes the heavy embedded trace from the front
page while keeping the full experiment accessible. Shared navigation and the
footer are rebuilt for keyboard use and smaller screens. Archive dates remain
visible. A field note documents the publishing failure with links to its PRs
and successful deployment.

The new Agent Check applies a visible editorial decision tree to six answers.
It distinguishes scripts, workflows, assistants and bounded agent trials. It
includes examples, reasons, practical checks, reset and copy. It makes no API
calls or claims of measured performance. The source and method are linked.

Validation: 12 JavaScript tests pass, including all 324 answer combinations.
The production build generates 883 pages. All 407 Markdown files and the model
and tool data validate. Six changed page routes have no broken local links or
missing in-page anchors. PR #196 passed CI and merged. The homepage and the agent preset were inspected
on the live site. The failed-build example returned the expected bounded-agent
trial. Chat key opt-in and removal were verified with a non-secret test value
after client hydration, without making a chat request.

## 12 September 2026: verified hosted model pricing

The public OpenRouter catalogue returned 445 models at 21:57 UTC. Exact ID
matching found 37 of the 39 tracked models. Sixteen stored price pairs changed,
including two now marked unknown because their IDs were not listed. Four open
weight models previously showed zero despite having paid hosted API rates.
Rates now retain the precision of the quote, with source and check timestamps.

The two missing IDs remain in the reference roster with unknown pricing, and
are excluded from cost estimates and chat selection. Two Claude display names
were newer than the IDs they actually called. Their labels now match the API.
Context and editorial capability data remain clearly identified as reference
material rather than newly verified benchmarks.

The bot no longer exempts open weight models from price updates. Existing
numeric swing and field-lock guards remain. A rejected quote is marked for
review, so old prices cannot inherit a fresh verification label. Invalid,
missing, non-finite and negative quotes become unknown, while a real zero is
preserved. A source-review record captures the observed changes and response
hash without pretending the separate systemd bot server ran.

Validation: 16 JavaScript tests and 86 bot tests pass. The production build
passes with 883 pages and the model validator has no errors. Missing IDs:
`google/gemini-2.0-flash-001` and `poolside/laguna-xs.2`.

## 12 September 2026: chat streaming and conversation costs

The chat reader previously split each network chunk into lines, then discarded
JSON that happened to end in the next chunk. A proper SSE reader now preserves
partial events and UTF-8 characters. Provider errors, interrupted streams and
empty completed responses are visible. It releases the reader on completion.
The playground prevents overlapping sends, offers a stop control, keeps model
and mode changes stable during requests and stops scrolling the whole page
when it hydrates. Cost labels clearly describe estimates for completed replies.

Conversation estimates now include the earlier user and assistant text sent
again on later calls. Each call has an input-history and output breakdown. A
trailing user message is labelled as a planned call with unknown output.
Unsupported tokenizer accuracy claims are removed. Cost-dependent tools show
unknown when a verified price is unavailable.

Validation: all 24 JavaScript tests pass, including every split point in an SSE
fixture, one-byte UTF-8 chunks, truncation and provider failures, plus repeated
history billing. The production build passes with 883 pages. No paid chat call
was made. PR #197's pricing deployment was separately verified live, including
an unlisted ID and an open weight model with a paid hosted rate.


## 12 September 2026: Feral recovery and publication boundaries

Feral's latest public cycle is still 5, recorded on 30 June. Its front door now
shows that date and distinguishes the configured schedule from a successful
run. The five original creations and complete historical ledger remain. The
new gallery makes each room easier to enter and gives the ledger readable type,
stronger contrast, keyboard focus and a return route to the main workshop.

The workflow checks the shared site before calling the paid council. Generation
and validation have read-only repository permission. A fresh validation job runs
the gate from the trusted base before checking out candidate code. The final
publishing job executes no generated source or npm scripts. It retains a PR and
candidate branch, then uses a normal fast-forward push in ship mode so concurrent
main changes or branch rules block publication. Pages receives the exact output
from the separate validation job. A failed candidate remains a 14-day artifact.

The gate now requires exactly one new cycle, unchanged prior ledger entries,
a current date, a complete build record and a fresh critic PASS with reasons.
It rejects changed symlinks and files outside Feral. The critic can now edit its
verdict, as its instructions already required. Local runs get a baseline build,
a turn limit and a copy of the base gate. Documentation no longer calls the
scope check a sandbox or claims arbitrary code is physically contained.

Validation: 28 JavaScript tests pass, including stale PASS, rewritten history,
invalid dates, outside paths and a committed symlink. The trusted gate accepts
a valid candidate before checking it out. Production build: 883 pages. The live
cost calculator from PR #198 was checked with a four-turn transcript and shows
repeated input history. Pages run 34722994244 succeeded at 22:32 UTC. A paid Feral
cycle has not been invoked or claimed successful during this recovery.

Actionlint 1.7.12 reports no workflow errors. A local bundle transfer verified
the exact candidate commit, parent and file content in a fresh repository.
