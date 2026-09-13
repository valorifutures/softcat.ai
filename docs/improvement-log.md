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


## 12 September 2026: Horizon editorial review

All 15 forecasts were reassessed. Seven remain, with primary source links,
fixed target dates, review notes and explicit resolution criteria. Confidence
changes explain the difference between available capabilities and measured
adoption. Eight forecasts were withdrawn because their terms, comparisons or
outcomes could not be judged consistently. Original April claims are preserved
in a review snapshot and a public review page. The freshness gate still warns
at 90 days and fails at 180 days for active forecasts. Retired records keep their
historical confidence dates rather than receiving artificial recurring reviews.

All 39 earlier Now signals moved to the historical archive. They had no direct
external references in their map entries and commonly inferred broad adoption
from summaries and opinions. The review does not declare all of them false.
Three narrow current observations now link to actual source material: MCP's
versioned schema, the SWE-bench maintainers' reported multimodal evaluation
update, and the exact model-ID results from our OpenRouter pricing audit.

The document-parsing essay's unsupported solved-problem and constant-cost
claims were removed and replaced with a dated correction. The original remains
in Git history. A new field note explains the source loop and editorial cuts.
Five Horizons now calls its dates editorial scenarios, shows the source-change
date and stops calling an absence of updates consensus.

The proposal bot receives the exact URLs extracted from its reporting inputs.
It strips invented or self-referential URLs, deduplicates references and rejects
patterns without direct links from at least two source hosts. It cannot award
confirmed. These checks are a minimum, not an automated assertion that sources
are independent or accurate. Draft and future-dated posts cannot enter context.

Validation: all 92 bot tests pass. Horizon validation reports 89 records with
no errors or stale active reviews. All 408 Markdown files parse. The production
build produces 887 pages. Feral's PR #199 deployment, run 34723661385, succeeded
at 22:47 UTC and the live front door was visually inspected.

Six changed journeys have 281 valid local links and anchors. The bot also skips
a paid proposal call when its context has fewer than two reporting source hosts.


## 12 September 2026: search and draft publication

Search previously hid fetch failures and treated scattered letters anywhere in
long text as matches. Its overlay had no native modal focus handling or visible
close control, and clicking the backdrop did not reliably close it. The new
native dialog supplies browser focus containment, a close button, Escape,
backdrop dismissal and focus restoration. Loading and retry states are explicit.
Queries require every word to match, prioritise titles and allow bounded title
typos. The index is validated before use and must link inside the site.

Glossary definitions, active forecasts, scenario routes, Feral creations and the
Horizon review now join the index. Retired forecasts are not presented as active
results. Draft flags are honoured when building all five article route families,
as they already were in the lists. Horizon's internal source links also exclude
drafts from their public-page index.

Validation: 32 JavaScript tests pass. A production build with one draft fixture
in each of five collections confirmed their absence from direct routes, search
and the sitemap. Fixtures were removed and the clean production build repeated.
All indexed routes and anchors were checked. PR #200's Pages run 34724517890
succeeded at 23:06 UTC. Its live withdrawal record was inspected. The eight old
proposal PRs #186 to #193 were closed individually with the review reasons.

The expanded index has 610 validated entries. Named tool searches for agent
check and tokens rank their interactive tools above incidental archive mentions.


## 12 September 2026: model comparisons with useful assumptions

Removed 117 numerical capability ratings from the 39-model roster. They had no
published measurement method. The model bot no longer assigns default scores
to proposals, and the data validator rejects the old rating fields. Reference
metadata still needs review. Existing price verification and delta guards stay
in force.

Model Explorer now redirects to one Model Comparison. The overlapping card and
timeline component was removed from the bundle and tool list. The replacement
compares dated token rates against editable input, output and call counts.
Illustrative presets state their assumptions. Exact model IDs are searchable
and copyable. The CSV includes the workload, unknown states, saved context,
check dates and source URLs. It guards against spreadsheet formula text.

Missing rates remain unknown. Input and output must fit the saved context to
produce an estimate. The UI calls these reference limits, explains excluded
charges and does not equate low cost with answer quality. Blank, fractional,
negative and unsafe counts cannot silently produce a zero-dollar total.

Validation: 37 JavaScript tests and 92 bot tests pass. Data and Horizon checks
report no errors. The production build has 887 pages. All 38 local links from
the comparison page resolve. The old Explorer route redirects and is removed
from the search index, which now contains 609 entries. No provider call was made.

PR #201's Pages run 34725367527 succeeded at 23:25 UTC. Live search ranked the
agent tool first, updated its active descendant with ArrowDown, and returned
focus to the opening button after Close. Loading and empty-result footer text
was refined in this pass.


## 12 September 2026: JSON contracts that are actually checked

The old JSON validator checked only a few keywords, counted individual rule
passes and could ignore numeric limits, additionalProperties or alternatives
while returning a pass. Null types and structural enums were also mishandled.
The replacement uses pinned Ajv 8.20.0 and ajv-formats 3.0.1 for draft-07 and
2020-12. It distinguishes syntax-only success, schema errors and actual output
failures. Unknown keywords and formats, unsupported drafts, remote references
and async schemas cannot become an accidental success.

Four worked examples include both broken and matching outputs: classification,
a bounded tool call, invoice extraction and answer-or-abstain. Reports show
JSON Pointer paths and the failed constraint, with a copy action. Editing either
input cancels the current job and clears its prior result. A pass concerns the
contract only, not factual accuracy or permission to execute a tool.

Compilation and validation run in a separate worker loaded on request. No
remote schemas are fetched. No types are coerced, fields removed or defaults
inserted. Each editor is limited to one million characters for validation and
formatting. A 2.5-second limit terminates costly regex or schema work, with an
explicit no-verdict state. Reports show at most the first 100 failures.

Validation: 46 JavaScript tests and 92 bot tests pass. Coverage includes both
drafts, null and union types, structural enum equality, numeric bounds, local
references, alternatives, conditionals, invalid schema shapes, inherited
property names, unsupported features, cancellation and a real worker stopped
during a pathological pattern. Content, model and Horizon validators pass.
The production build has 887 pages. The validator UI is under 4 KB gzipped,
with the 152 KB validation worker loaded only when a check is requested.

PR #202's Pages run 34726346880 succeeded at 23:48 UTC. Live verification found
Sonnet by its exact model ID, changed 1,000 calls to ten and produced $0.105,
kept Laguna's unlisted price unknown for zero calls, and confirmed CSV export.
The model page was visually inspected. Search's native Escape key check also
closed the dialog and restored focus to its opening button.


## 13 September 2026: fewer claims, a better record

Five earlier essays were rewritten with explicit corrections. Removed
unsupported pricing and monitoring allegations, a claimed 80 per cent prompt
reduction, an undocumented whole-project test, blanket dismissals of agent
controls and a mental-health metaphor for hybrid routing. The replacement
articles state what was withdrawn and offer concrete evaluation questions.
Original dates and URLs remain, with links to the earlier Git versions. The
OCR correction from the previous pass now shares the same structured record.

A correction date and summary render prominently on the article and provide
its actual dateModified metadata. The Thoughts page leads with six corrections
and uses a compact monthly archive instead of a long stack of decorative cards.
The homepage and related links for field notes recommend actual build notes.
A third notebook entry documents the JSON validator failure and its real tests.

The cause of the unsourced essays was explicit in the old thoughts prompt:
it required a strong hot take and forbade source links. The new bot includes
feed URLs, asks for attributed claims and a concrete uncertainty, and forbids
invented first-person tests. A strict JSON response is converted into canonical
frontmatter with draft true. Unknown source URLs, missing citations, raw HTML,
incomplete output and false field-note/correction tags are rejected. Existing
files cannot be overwritten, and truncation is a failed generation. Drafts
are counted separately from published items. No live generation was invoked,
and the separate systemd host is still unverified.

Validation: 107 bot tests and 46 JavaScript tests pass. Fifteen new bot cases
cover canonical metadata, source restrictions, insufficient-input early exit,
truncation and refusal to overwrite or publish an unchecked draft. Content,
model and Horizon checks pass. The ten changed reading journeys have 578 valid
local links and the 610 search entries resolve. Original tag routes are kept.

PR #203's Pages run 34726825234 succeeded at 00:00 UTC. The live JSON tool was
visually inspected. Classification failed on the three expected constraints,
the matching example passed, edits cleared the result, and invoice extraction
identified the date and two numeric errors. A pathological pattern stopped
after the browser timeout and the next example remained usable.


## 13 September 2026: model weights with sources

The model browser still carried four incorrect closed-weight labels: Mistral
Large 3, Mistral Small 3.1, Kimi K2 and Kimi K2.6. The old boolean also blurred
public files, gated access and different licences. We checked publisher model
repositories using their public metadata and recorded exact revisions,
published weight-file counts, model-card licence labels and access conditions.
Nineteen tracked models now have those records, including Laguna XS.2.

The comparison links directly to those revisions. Its filter asks whether a
weight source is recorded. Missing evidence does not become a closed-weight
claim. Llama's gated files are labelled as gated, and custom model-card terms
are not represented as an open-source certification. The CSV includes the
weight source, licence, access condition and check date. No weights were
downloaded and no model inference ran during the audit.

Removed 273 unused reference values: promotional descriptions, strengths,
openSource booleans, model-family labels, release dates and capability flags.
They were no longer used by any tool, and some contradicted the recorded data.
The catalogue keeps exact IDs, names, providers, context references, dated
prices, tracking links and checked weight records. All price and context
values were compared before and after and remain unchanged.

The roster bot no longer guesses a release month or supplies capability
defaults. New entries carry rosterProposal true and an unknown weight record.
Validation prevents that marker from merging until the entry is reviewed.
The legacy price delta and locked-field checks remain. An audit file records
the 19 sources and four incorrect prior labels.

Validation: 49 JavaScript tests and 107 bot tests pass. All content, model and
Horizon checks pass. The production build has 889 pages. Tests cover missing
weight evidence, gated access, malformed records and provenance in CSV output.
The unlisted Laguna API price remains unknown despite its published weights.

PR #204's Pages run 34727595474 succeeded at 00:18 UTC. Its live correction
record was visually inspected. The prompt essay keeps its original 3 July
date, separately displays the 13 September correction and links the original
text. The archive shows six corrections and 124 earlier essays.


## 13 September 2026: restore a verifiable daily price job

The separate bot server remains unverified, so source repairs alone cannot
restore its daily timers. The new Model price snapshot workflow runs the unpaid
public-catalogue check in GitHub Actions, daily at 05:30 UTC. A push affecting
its script or workflow also starts a check, making the first deployment a real
integration test. No AI provider key or inference call is needed.

Only existing model IDs and token-price fields can change. The planner rejects
empty, duplicate or badly incomplete catalogues. It preserves all other model
metadata. Missing quotes stay unknown. Changes over 50 per cent, zero-to-paid
changes and changed locked prices are held as review-needed, excluded from
cost calculations and recorded with their actual quoted values. The snapshot
records all 39 comparisons and a hash of the public response.

A read-only job checks the candidate data and builds the site. It passes an
exact commit bundle and Pages artifact to a separate publishing job. That job
checks the commit, parent, allowed paths and file modes before a normal
fast-forward push. A concurrent change or repository branch rule rejects it.
The candidate is retained if publishing fails. Since a GitHub token push does
not start the ordinary Pages workflow, this workflow deploys its checked
artifact without running project code with publication credentials.

The ordinary Pages build now also runs model, Horizon and JavaScript checks,
so a direct bot commit cannot skip the same data gates. Pages credentials are
limited to its deployment job. Pipeline copy distinguishes the GitHub price
job from the still-unverified server bots. New run records link to the actual
workflow and describe the zero inference cost separately from hosting.

Validation before first execution: 55 JavaScript tests and 107 bot tests pass.
All content, model and Horizon checks pass, and Actionlint reports no workflow
errors. The production build has 889 pages. Replaying the previously fetched
445-model catalogue gives 37 verified prices, two unlisted IDs and zero price
changes. No live refresh was invoked locally. Actual scheduled publication
still requires the first post-merge workflow run and will be checked next.

PR #205's Pages run 34728191461 succeeded at 00:32 UTC. The live weight filter
shows 19 entries and two gated sources. The homepage's three notebook links
were checked against its rendered content.

## 13 September 2026, project and feedback pages

The first Model price snapshot run completed successfully in GitHub Actions at 00:55 UTC. Run [34729167469](https://github.com/valorifutures/softcat.ai/actions/runs/34729167469) fetched the real public catalogue, checked all 39 tracked IDs and published data commit `43abdfed732c03072f4b6e64dc5a91fc59b43880` through its separate publishing job. Both the normal Pages run and the snapshot's inline Pages deployment succeeded. The live Pipeline shows the real run at 00:54 UTC, and the model comparison displays that same snapshot date. There were 37 verified prices, two unlisted models, no price changes and no paid model call.

The About page previously claimed practitioner credentials and a Latin etymology without supporting material. It now explains the actual playground, tools, notebook and source records, with direct links and a cream SOFT CAT name card. Its editorial standards describe dates, evidence, corrections and the limits of run records. The collective identity remains anonymous.

Contact now gives visitors three specific routes: a reproducible bug, a sourced correction or a small experiment with a way to judge the result. Three repository issue forms support those links. Email remains available, without the old promise that every message is read. The page explains that GitHub issues are public and asks for a small redacted example. No message or issue was sent during this work.

The production build passes at 889 pages. Parsed the four feedback YAML files, checked unique form field IDs and required labels, and verified all 78 internal links across the two built pages. Layout changes are CSS-only with narrow-screen rules and no additional client script. Live visual checks follow publication.

A further tool review found that Prompt Workbench emits Anthropic cURL requests containing OpenRouter IDs, fails to quote apostrophes safely, claims clipboard success before it resolves and only hands the system prompt to Chat Playground. Those concrete faults are the next batch.
