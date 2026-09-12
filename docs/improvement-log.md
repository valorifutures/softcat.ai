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
missing in-page anchors. Visual and interaction verification follows deployment.
