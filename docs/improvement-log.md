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

## 13 September 2026, Prompt Workbench repair

PR #207 deployed successfully in [run 34729677617](https://github.com/valorifutures/softcat.ai/actions/runs/34729677617) at 01:06 UTC. The live About page and three Contact routes were inspected and screenshotted. The source and issue-template links match their intended destinations. No feedback message was submitted.

Prompt Workbench's old cURL export paired OpenRouter model IDs with Anthropic's direct endpoint. A normal apostrophe could also break the surrounding shell quote. It now exports OpenRouter chat requests with the exact selected ID, standard message roles and a visible 2,048-token output limit. A POSIX shell fixture proves that apostrophes, quotes, backticks, dollar signs, command-substitution text, newlines and Unicode arrive unchanged at a stub request function. No network request or actual API key was used in that test.

The editor now shows a complete export preview and offers copy and download. Clipboard success waits for the browser operation. Four worked examples replace eight generic templates, including a valid invoice JSON Schema and an example where the source cannot answer the question. Variable replacement uses only explicit string values, does not recursively expand input and stops oversized expansion before constructing a large result. Missing variables block request exports while remaining visible in plain text.

Saved prompts retain the old library format and assistant prefixes. Each new save keeps earlier versions. Library reads validate the whole record set, writes detect another tab's changes, and failures leave the editor and existing storage intact. Backups can be downloaded and imported without replacing existing prompts. Invalid stored data can be downloaded for recovery. Loading over edited content and deleting a saved version have explicit in-page controls.

Chat Playground now imports both the filled system prompt and user draft with the selected model, once through tab session storage. It never sends on import. Expired or malformed transfers are rejected. A model missing from the current verified list requires a new choice. The user draft can be edited before adding a key. Assistant prefixes remain exportable but do not transfer to the playground, which does not implement prefilling. Privacy text records the transfer behaviour.

Validation: 65 JavaScript tests pass, including ten new regression tests. All content, model and Horizon validators pass. The production build has 889 pages. Live interaction checks follow deployment. A separate Prompt Diff review found an unbounded synchronous LCS allocation, which is queued next.

## 13 September 2026, bounded prompt comparisons

PR #208 deployed in [run 34730422048](https://github.com/valorifutures/softcat.ai/actions/runs/34730422048) at 01:24 UTC. The live Workbench showed the correct OpenRouter endpoint and selected Sonnet model ID, copied the export and preserved two QA versions through a reload. The original version restored the Saturday question. A later version transferred the weekday question and selected model into Chat Playground. Both the system prompt and user draft were inspected after transfer. Send remained disabled without a key and the draft could be edited. No model request was made. The two explicitly named QA versions remain temporarily for the next integration check.

Prompt Diff previously built an unbounded two-dimensional LCS table synchronously on every edit. A long pasted prompt could exhaust the page's memory. It now compares only when requested, in a worker with a two-second deadline. Shared boundaries are trimmed before detailed work. A two-million-cell budget and 600-segment display limit produce explicitly labelled changed blocks when a detailed alignment would be too large. No text is truncated, and the description explains that shared words can remain inside a marked block. Editing clears and cancels the previous result.

The Workbench picker validates the saved library, distinguishes versions by date, fills saved variables when requested and offers template text as a separate choice. It does not modify storage. The comparison has labelled editors, keyboard-scrollable result regions, optional whitespace marks, semantic insertion/deletion marks and a report containing both prompts and the dated price source. Cost reductions now retain their minus sign. The unsupported claim of roughly 15 percent token-estimate accuracy has been removed.

A new field note, “An export should survive an apostrophe”, records the actual Workbench failure and its shell and browser checks. Its timestamp is the writing time, and it links the merged PR and test source.

Validation: 73 JavaScript tests, 107 Python bot tests, all three validators and the 891-page build pass. New fixtures reconstruct both inputs exactly across 100 whitespace/Unicode pairs, preserve large inputs through the block fallback, enforce the size and display limits, retain small negative cost deltas and terminate a stuck real worker. Checked headings, unique IDs and 162 local links across the two prompt tools, notebook and new field note. The worker bundle is 1.95 KB and the Diff UI is 4.56 KB gzipped. Live interaction checks follow publication.

## 13 September 2026, live comparison verification and hover contrast

PR #209 deployed in [run 34731220537](https://github.com/valorifutures/softcat.ai/actions/runs/34731220537) at 01:43 UTC. The shorter worked pair showed an input-cost delta of minus $0.00000756 at the selected saved rate. Copy report succeeded and editing cleared the old comparison. Two roughly 30,000-character prompts produced labelled changed blocks while the page remained usable. Both saved Workbench QA versions loaded their distinct questions with variables filled. Those two versions were then individually deleted through the Workbench controls, restoring the initially empty library. No API key or model request was used.

The live screenshot exposed a CSS specificity problem: the generic button hover colour could override the dark text of a lime primary button. Explicit primary-button hover rules now preserve dark text against a lighter lime background in both prompt tools. This is a small visual repair before the editorial retirement batch. No new behaviour tests were needed for the two CSS rules.

The archive inventory found 114 entries added by bot thought commits, three early opinion pieces and one launch article outside the already corrected essays and field notes. The 114 bot essays have no external source URLs. The old generator explicitly required no source links. Sampled numerical claims included 16x throughput, 90 percent accuracy gains, 90 percent machine internet traffic and a benchmark score presented as a general production success rate, without the necessary source, model or test details. The next curation will retire the unsourced series and three weak early opinions, preserve source history and old routes, and correct the launch article's present-tense description of the older bots.

## 13 September 2026, retiring the unsourced essay series

PR #210 deployed in [run 34731828772](https://github.com/valorifutures/softcat.ai/actions/runs/34731828772) at 01:58 UTC. Live inspection confirms that the primary-button hover retains dark text on its light lime background.

Removed 117 essays from the reading collection: 114 added by the bot's thought commits and three weak early opinions. The entire group had zero external source links in the published body. The automated cohort followed an instruction explicitly forbidding source links, with repeated sweeping conclusions and numerical claims that could not be traced from the page. This is an editorial retirement, not a declaration that every sentence is false.

A public removal record lists each original title and date. Every old article URL now explains its removal and links to its exact preserved Git source. The machine-readable inventory records the source revision, original blob hash, originating commit and reason. All 117 blob hashes were checked against the frozen source revision. The notices ask search engines not to index them, and the removed text is absent from site search, RSS, sitemap, tags and related reading. The Horizon validator permits the 35 existing retired-essay references only in historical records, never as support for an active entry.

Seven corrected essays remain with four field notes. The launch article keeps its actual 13 March publication date and now describes the old six-job design as history. It links the real September repair and successful GitHub price run, and distinguishes those from the separate unverified server. The Thoughts index presents the corrections and removals without duplicating the same articles in a monthly list.

Checking all reading paths exposed seven missing glossary tag routes and 36 broken links. Both tag indexes now use one shared published-content catalogue that also includes prompts and glossary terms. Entries are grouped by kind, undated prompts stay undated, and the old nested article/tag anchors are removed. Search now includes the correction/removal records, About and Contact. PostLayout also forwards the page's breadcrumb metadata, which was previously discarded.

Validation: 77 JavaScript tests, 107 bot tests and all three data validators pass. The production build reports 885 pages. A full crawl checked 47,891 internal links with no broken destinations, every retired route and all 498 indexed search destinations. The retirement routes have noindex metadata, one main heading and unique IDs. No paid model call was made. Live review follows publication.

## 13 September 2026, a real context budget

PR #211 deployed in [run 34733242231](https://github.com/valorifutures/softcat.ai/actions/runs/34733242231) at 02:31 UTC. The public removal record, expandable May list, representative notice, corrected launch article and restored glossary tag were checked live. The notice's source URL points to the frozen original file. Search for “removed articles” finds the removal record. A visual check confirmed the notice's layout.

The old context visualiser listed eight hard-coded models and set every bar to the same percentage. It could not compare whether one actual request fitted different limits. It is now a Context Budget Planner, with inputs for instructions, repeated history, documents/new input, tool definitions/results, reply allowance and unused headroom. Three illustrative workloads expose different constraints. A copyable or downloadable plan preserves all counts, exact limits and their dated source. The same request can be compared across the full tracked roster.

Fetched OpenRouter's public 445-model catalogue at 02:31:34 UTC without an API key or paid inference. Thirty-seven tracked IDs have usable context quotes and two are unlisted. Five entries disagree between the catalogue context and its top-provider context. The review preserves both values and uses the smaller known limit, separately checking the top-provider output cap. For Sonnet 4, the two context quotes are 1,000,000 and 200,000 tokens. These remain catalogue records, not a guarantee of live route acceptance.

Removed the rounded contextK fields from the public model data and replaced them with exact, sourced records. All 39 were replayed against the fetched response, whose SHA-256 fingerprint is saved in the review. Prices, weight evidence and other model metadata were preserved. Model Comparison now uses these same limits, rejects known output-cap violations and includes the exact context provenance in CSV exports. The legacy server price job preserves reviewed context and no longer silently adds rounded values. Both the server and GitHub price fixtures cover preservation of the reviewed context. No server job was run.

Validation: 84 JavaScript tests, 108 bot tests, all three validators and the 885-page build pass. The clean output contains 885 HTML files and 499 indexed search entries. Its complete crawl checked 41,069 internal links without broken destinations. New fixtures cover divergent quotes, precise boundaries, missing limits, invalid and unsafe budgets, separate output caps, zero-count plans and exported assumptions. The earlier local retirement crawl also included stale tag output from the prior collection. These are absent in this clean build. Live interaction checks follow publication.

## 13 September 2026, text estimates that account for the whole transcript

PR #212 deployed in [run 34733943861](https://github.com/valorifutures/softcat.ai/actions/runs/34733943861) at 02:49 UTC. The live planner's 274,000-token code example exceeds Sonnet's planning context by 74,000. Its long-reply example uses 85,000 total tokens but still exceeds the separate 64,000 output cap by 6,000. Copy succeeded. Zero-count Laguna remains unknown, filtering finds GPT-4.1's exact 1,047,576-token context, and a negative count gives an error. The shared Model Comparison rejects a 64,001-token Sonnet reply. Both the input area and cream result card were visually inspected, including button hover.

The text-cost calculator previously discarded unlabelled prefixes and ignored system instructions. A fully unrecognised transcript could therefore appear to cost zero. It now validates the whole transcript before showing a result. System instructions count as repeated input, each reply requires a preceding user message and literal role labels inside fenced code are preserved. A strict message-JSON option supports exact strings without interpreting their labels or fences. Unsupported message types and extra fields are rejected instead of silently omitting possible charges.

Visitors can inspect every parsed message and each call's repeated history. A final user message produces an explicitly input-only planned call. Missing output is omitted, not assumed free. Single-request mode also labels an empty output field as input-only. The same recorded context and output-cap checks used by Model Comparison now apply here, and one impossible call cannot disappear into a partial total. The page remains clear that character estimates are not real tokenizer counts or provider usage.

Copy and download preserve original text, approximate counts, per-call status, dated prices, context limits and assumptions. Inputs stay in the page and are not saved. Both formats have a 200-message and 200,000-character transcript bound. Oversized text is rejected without truncating it. The new layout includes examples, labelled mode controls and keyboard-scrollable message and cost regions.

Validation: 91 JavaScript tests, 108 bot tests, all three validators and the 885-page production build pass. Seven new parser/cost fixtures cover repeated system text, rejected preludes, code fences, CRLF, strict JSON, size bounds, missing replies, impossible calls and report provenance. The complete link crawl is clean. Live interaction checks follow publication. No paid model call was made.

## 13 September 2026, a smaller prompt collection with checks

PR #213 deployed in [run 34734576478](https://github.com/valorifutures/softcat.ai/actions/runs/34734576478) at 03:05 UTC. Live checks rejected an unlabelled prelude and an unsupported tool_calls field before pricing. The growing conversation example produced per-call input estimates of 11, 45 and 71 tokens, with 24 and 16 output tokens and a final input-only call. Its combined supplied text estimate was USD 0.000981. Copy succeeded. Strict JSON preserved a literal role label and an unclosed fence inside one message. Single-request mode also labelled its missing output as input-only. No model call or persistent browser data was created.

The prompt inventory contained 84 templates, including 66 added by bot commits. It included near-duplicate agent validators and KV-cache prompts, requests for numerical reliability or confidence scores without defined measurements, and an extraction template promising clean JSON every time. Retired 72 templates, comprising all 66 generated entries and six earlier templates. This is an editorial decision, not a claim that every template failed.

The remaining twelve tasks were rewritten as worked recipes. Each names its inputs, supplies an example and target, gives explicit checks and explains what a response cannot establish. The examples cover grounded extraction, source summaries, rubric-based answer comparison, tests, code review, debugging, refactoring, prompt reduction, assistant boundaries, accessibility evidence, query plans and text-token costs. They are labelled as targets, not saved responses from a model. Actual fixture checks reproduced the JavaScript boundary and zero-quantity bugs, checked four refactoring cases, reconciled USD 0.0288 of illustrative usage and compared an in-memory SQLite query before and after an index. The SQLite fixture returned the same twenty rows in the same order. No latency gain was measured.

The collection has search and task filters. Recipe pages switch between the reusable prompt and filled example, with clipboard success reported only after copying succeeds. Each can open an editable Workbench draft with its example inputs. Nothing is saved or sent automatically. A public review and 72 noindex retirement notices preserve exact source revisions, blob hashes and originating commits. Dates are labelled as Git history dates because the old templates lacked publication dates. Retired material is absent from active collections, search, tag pages and sitemap.

The prompt bot now proposes exactly two unpublished JSON drafts. Publication metadata is owned by the writer, not accepted from model output. The writer rejects duplicate JSON keys, unexpected fields, truncated batches, retired tasks, existing paths and attempted review-state injection. It validates the whole batch, creates files exclusively and checks the resulting frontmatter before history or Git changes. Failed validation or interrupted writes remove only that batch's files. A competing file is preserved. Run records report zero publications and two proposals. The separate host remains unverified and no paid generation job was run.

Validation: 95 JavaScript tests, 124 bot tests and all three data validators pass. A temporary unpublished fixture was excluded from every built page, search entry, tag route and Workbench payload. The fixture was removed afterwards. The production build has 724 pages, 429 search entries and 245 tag pages. A full crawl checked 33,912 internal links without broken destinations. All 72 prompt source blobs match their frozen revision, and both sets of retirement notices retain one main heading and unique IDs. Live interaction checks follow publication.

## 13 September 2026, the workshop directory and old recommendations

PR #214 deployed in [run 34736228880](https://github.com/valorifutures/softcat.ai/actions/runs/34736228880) at 03:45 UTC. Live recipe filters narrowed regression to one result, then zero with Source work, and restored twelve with Clear filters. Keyboard activation switched the extraction recipe to its filled example. Copy succeeded and its desktop prompt/target layout was inspected. Workbench received the template and both example variables without saving or sending. Saved remained zero. An unknown recipe showed a neutral notice without changing that library. The representative retirement notice preserved its 25 March Git date and exact source. Search found the current collection and review, not the retired validator.

Rebuilt the Tools entrance as a static workshop directory. Eight tool cards state their purpose and data behaviour. A short first lap links a worked extraction recipe, its editable Workbench draft and the JSON checker. Seven tools need no API key. The one connected tool visibly names OpenRouter, the visitor's key and provider charges. Prompt recipes now have a main-navigation link. The unused client-side category filter and weekly feature-rotation module were removed.

Retired the 38-entry external write-up series, comprising 34 bot discoveries and four early recommendations. Most discoveries summarised technology-news articles, while the early entries included first-hand-use claims and strong product verdicts without linked test records. This is a decision to stop maintaining that recommendation directory, not a judgement that the products are bad, unavailable or unsafe. A public review and old-route notices keep every original title, publication date, immutable source revision and blob hash. Historical link-check dates are explicitly HTTP reachability records, not evidence of hands-on testing.

Corrected the three local guides against the implementation. The context guide explains whole-request budgets and separate output caps. The calculator guide removes the unsupported 15 percent token-estimate accuracy claim and records the actual repeated-history example. The site guide replaces its blanket self-maintaining claim with the checked GitHub publishing path and the still-unverified server boundary. Each retains its original publication date, shows a separate September correction and links implementation evidence and earlier text.

The tool bot now accepts a bounded JSON proposal with a supplied source link and writes only a canonical unpublished draft. It rejects model-authored review state, duplicate keys, invented source URLs, truncated responses, retired titles or sources, and existing paths. Failed content validation removes the created draft before history changes. The link verifier skips drafts and cannot promote them. Run records distinguish one proposal from zero publications. No paid generation or external product test was run, and the separate server was not restarted.

Validation: 97 JavaScript tests, 141 bot tests and all three data validators pass. A temporary tool draft stayed out of every built HTML page, search entry, tag route and text export. It was then removed. Clean production output has 632 HTML pages, 392 search entries and 152 tag pages. The full crawl checked 30,534 internal links without broken destinations. All 38 tool source blobs were checked, alongside the 72 prompt and 117 essay records. The new directory, review, guide and retirement pages have one main heading and unique IDs. Live visual and navigation checks follow publication.

## 13 September 2026, a permanent offline publication gate

PR #215 passed CI in run 34737099587 and merged as 4da2cddc3daeb798ebc3a5929e65c90edf531cfa. Its Pages run 34737190807 remained queued for a GitHub-hosted runner during this pass, with no build steps executed. The prior site remained available. This checkpoint does not claim that the directory was already live.

Turned the one-off built-output audits into a repository check. The read-only gate follows local links, fragment targets, redirects, HTML-referenced assets and discovery-index destinations. It detects duplicate IDs, nested links and missing or repeated main headings in the shared site layout. Standalone art rooms retain their own document designs, while their links, assets and IDs are still checked. This is not a claim of complete accessibility or external-link verification.

The content inventory uses the same locked YAML parser as the existing validator. Published records must have built routes. Drafts must not acquire routes or index entries, and removed or draft-only tags must not leave stale output behind. Each retirement notice needs a heading and noindex metadata, must stay out of search, feed and sitemap, and must match its preserved Git blob. A future custom 404 page must also remain outside discovery indexes.

The gate runs after the build in PR validation, normal Pages deployment and the model-price candidate job. It adds no network requests and no write permissions. The price workflow's publishing job remains unchanged. Editing that workflow will also trigger its existing unpaid bootstrap snapshot after merge, subject to runner availability.

Validation: all 97 JavaScript and 141 bot tests pass, along with twelve new standard-library publication fixtures. They exercise broken destinations, missing fragments and assets, path escapes, malformed indexes, nested links, duplicate IDs, draft leaks, stale tags, retirement metadata and source mismatches. Actionlint passes for the three workflows. The actual 632-page build passes 31,471 internal references and 3,246 local asset or metadata references, with 392 search entries, 183 content records and 227 verified retirement notices. The queued deployment and future live checks remain distinct from this offline result.

## 13 September 2026, finishing the publication gate

The maintainer stopped the overnight loop and then authorised completing the pending PRs and a content tidy-up. The recurring loop is disabled. PR #215 has a successful Pages build, but its deploy job remains queued. PR #216 has a queued CI build. GitHub refused to rerun either pending job because it considers the containing runs active. These states do not establish a build failure or a successful deployment.

Added concurrency scoped to each PR so a future revision cancels its own obsolete validation run. Separate PRs remain independent and every validation step is retained. The earlier queued run predates this configuration and is not guaranteed to be cancelled by it. The next real commit receives fresh checks.

Validation of this follow-up: actionlint passed for the updated workflow, all twelve publication-gate fixtures passed, and the production build produced 632 pages. The gate checked 31,471 internal links, 3,246 local assets and metadata references, 392 search entries and all 227 retirement records without errors. Hosted CI is still required before merging.

## 13 September 2026, removing the last misleading demo and finishing the reading paths

PR #216 passed hosted CI in run 34746422029 and merged as 4849b59127f1ca9a71018259344042092eba0120. Pages run 34746575258 succeeded at 08:00 UTC. The earlier PR #215 deployment and PR #216 validation runs also completed successfully. The live Tools page was visually inspected and its DOM confirmed eight tools, the OpenRouter disclosure, three corrected guides and the 38-entry removal record.

Removed the 1,000-line trace renderer. Its hard-coded run date, counts, timings and LIVE status had been promoted by the homepage as recorded activity. The old route now carries a noindex retirement explanation, links to actual pipeline records and preserves the exact earlier source in Git. The homepage card now opens the existing Context Budget Planner. The retired demo is excluded from the sitemap.

The reading export now preserves all seven thought correction notices, all three tool reviews and the examples, checks and limits for all twelve recipes. Original dates and per-entry URLs remain explicit. Illustrative targets are distinguished from recorded model responses, and historical news is labelled as an archive. The export states its scope and excludes drafts. Updated llms.txt and the worker context to reflect the curated directory and recipes.

Added a custom 404 page with working recovery links, removal-record links and the shared keyboard-accessible search control. The publication gate caught a canonical URL pointing to Astro's intermediate /404/ route. The page now declares its actual /404.html canonical path through the shared layout, and stays out of the sitemap and search index.

Validation: 101 JavaScript tests, 141 bot tests and twelve publication-gate fixtures pass. Content, model and Horizon validators pass. The 633-page production build passes 31,558 internal-link checks, 3,256 local asset and metadata checks, all 392 search entries and all 227 preserved retirement records. Export inspection found seven corrections, three reviews and twelve explicit recipe check sets. The local browser preview was blocked by the browser environment, so visual and keyboard checks of the new pages follow deployment. No paid model call was made. The separate server remains unverified.

## 13 September 2026, live verification and a paused handover

PR #217 passed every hosted validation step in run 34746811362 and merged as c1a05997fbd657e637bfc9203e117d837ec27203. Pages run 34746872537 completed successfully at 08:08 UTC. The live homepage opens the Context Budget Planner in place of the trace demo. The old trace URL explains the fixed figures and links to its exact earlier source.

The live text export returns HTTP 200 and contains seven correction notices, three tool reviews, twelve illustrative recipe targets and twelve check sets. A deliberately missing URL returns HTTP 404 with the custom noindex page. Keyboard Tab reaches Skip to content and Enter moves focus to the main region. Enter on the header search control opens the dialog. A nonsense query shows an explicit zero-result message, and context budget finds the tool and its corrected guide.

The desktop recovery page was visually inspected. Its two primary recovery links, one on 404 and one on the trace notice, now use the existing filled button style for a clearer next action. Responsive wrapping and the shared mobile breakpoints were inspected in CSS. An actual mobile browser viewport was not available in this follow-up. This is not recorded as a mobile browser test.

The checkpoint has no active branch. The recurring loop remains disabled, and there is no promise of further unattended execution. The separate bot server and fresh paid model runs remain outside what was verified. The final checkpoint and button classes still pass the normal PR and Pages gates.

## 13 September 2026, making Horizon the main experience

The maintainer approved the interactive Horizon direction and asked for repeated checks, refinement and release. The homepage now leads with Horizon and previews its five futures. The agent decision experiment remains available further down the homepage. The main navigation puts Horizon first.

The new page uses a paper and forest palette, readable rows and a briefing that changes with the selected future and outlook. Equal calendar intervals show explicit ranges. Optimistic deadlines use diamonds. Open-ended sceptical wording remains text, without borrowing the old representative years as precise forecasts. Every future exposes assumptions, blockers, implications, a signal to watch and primary sources with stated limits. Shared URLs preserve the selected future and outlook, including browser history. Copy failure reveals a selectable URL.

The evidence was reassessed against primary research and publisher documentation on 13 September. The April arrival windows remain illustrative scenarios. They were not recalibrated or given fresh probabilities. The education assessment explicitly distinguishes improvement within institutions from the older full replacement threshold. An interactive AGI section compares breadth, economic work and adaptation, with sources and our proposed evidence criteria.

The earlier observations, forecasts, arguments and history now live in the supporting record. Old Horizon fragment links continue to their matching entries, including repaired Now anchors. The earlier five-futures route redirects to Horizon and stays outside search and the sitemap. The unused strip renderer and its uneven-axis helper were removed. Historical source data and dates remain intact.

Validation: the production build has 634 pages. All 108 JavaScript tests, 141 bot tests, twelve publication fixtures and three data validators pass. New regression cases cover vague dates, equal axis intervals, all fifteen shared-view combinations, invalid URL state and date changes without a matching evidence review. The built-site audit checks every internal link, fragment and local asset without errors. The second build and publication audit passed after refinements. Static output includes the default briefing and no-JavaScript reading links. Local browser preview access is blocked by the browser environment, so visual and keyboard checks follow the hosted release. Hosted CI and deployment are still pending at this checkpoint. The recurring loop remains disabled.

## 13 September 2026, live Horizon review and final refinements

PR #219 passed hosted validation in run 34779156310 and merged as 633c8f2027f4dcee0d9cca8c5f61d7d01b107b7a. Pages run 34779219315 completed successfully at 19:57 UTC. The homepage, default map, sceptical presentation, evidence section and AGI definition panel were visually inspected on the live site.

The live briefings and evidence changed with the selected futures. Enter selected General intelligence and Space selected its optimistic outlook. Economic work and adaptation opened their corresponding AGI definitions. An education/sceptical URL opened with the correct selection in a second tab. Browser Back restored the preceding education/pragmatic state. Copy reported success and an actual paste into the local site-search field reproduced the exact AGI/optimistic URL. The browser's clipboard inspection API returned empty despite the successful paste, so the user-visible paste was used as the verification. No external message was sent.

The older scenario fragment redirected to the matching entry in the supporting record. The retired five-futures route preserved a robotics/sceptical query through its redirect. The homepage places the five-future preview beside the main invitation. Search finds the new page, evidence record and review record.

This review exposed misleading presentation of the existing branch data: some counterevidence would accelerate change, even though the panel labelled it as a delay. The final refinement uses “What this assumes” and “What could change this view”. Pragmatic education also states its partial institutional scope beside the broader definition. Existing historical scenario wording is preserved. A Horizon search tag and a new search shortcut put the main experience ahead of supporting records, without changing the search algorithm.

The final refinement passes its production build, eleven focused Horizon/search regression cases, Horizon validation and the complete 634-page publication audit: 31,660 internal links and 3,262 local asset or metadata references. The actual built search index returns `/horizon` first for “horizon”. Hosted gates still apply to this follow-up commit before publication. Responsive wrapping and breakpoints were reviewed in CSS. The browser exposed no mobile viewport, and its zoom shortcut did not change the viewport. No mobile device test is claimed. The checkpoint clears the active branch for handover, with the recurring loop still disabled.

## 13 September 2026, refreshing a returning visitor’s search index

PR #220 passed hosted run 34779709932 and deployed as acb645af72bae1079b0e760f3bc56a6513d8a0ad in Pages run 34779766500 at 20:08 UTC. The live education view shows its partial scope and new counterevidence label. Search offers the new Explore Horizon shortcut.

The last live check found that a returning browser still ranked the earlier index. An independent HTTP revalidation returned the new Horizon tag with status 200, while the index response declared `max-age=600`. The new page was inheriting the previous deployment’s browser-cached JSON. Search now requests HTTP revalidation the first time it loads an index in a page. The existing in-page index, abort behaviour and retry state are retained. This adds no service, persistent storage or new data destination.

The fix passes the production build, the four search regression cases and the full publication audit. Hosted checks apply before merge. Verification after deployment must use the existing browser session that exhibited the stale result, so a clean browser cache cannot conceal the failure. The earlier live checks, desktop-only limitation and disabled recurring loop remain as recorded above.


## 13 September 2026, five evidence-responsive scenario clocks

PR #221 passed hosted validation and deployed as b14046fb68e69790f77b71538e82f5b0867b6fd3 in Pages run 34780043251 at 20:13 UTC. The returning browser saw the refreshed Horizon search entry. The maintainer then asked for five countdowns, evidence-driven target movement, CEO thinking and another build, review and release cycle.

The new forest clock band shows all five futures, with a selected lime card. Each counter follows the published timeframe wording. Ranges count to their opening year, then to the end of their final year. By-dates include the whole named year. Indefinite sceptical claims remain undated. Expiry asks for review and never declares an arrival. Pause/resume, visible snapshot labelling, UTC conventions and accessible day counts avoid a false live or precision claim.

The original April definitions and all 15 timeframes were checked against Git commit 3066df13e0493ef1446c9a3e48f307aa8bf30e5f. The append-only clock history preserves that baseline and the actual 13 September evidence review, which retained every window. No movement was invented. The interface distinguishes earlier/later movement, wider/narrower windows and changed thresholds. Partial reviews retain each future’s own evidence date. The validator compares current dates, scope, assessment and sources with their latest history entry and rejects rewritten published records.

Each future now has a CEO question, a next-90-days move for each outlook and a measure of success. Tenfold improvement is a design challenge to test, not a promised gain. The existing timeline is available in an expandable comparison, and sources, limitations, shareable views and AGI definitions are retained. Homepage and search invite visitors into the new clocks.

An open page checks the published clock data on load, every five minutes while visible and on return. HTTP revalidation and append-only payload checks prevent a cached earlier review from rolling back a decision. A failed check retains the last verified data and offers retry. This refreshes published decisions and does not claim continuous research assessment. The recurring improvement loop stays disabled.

Validation: 119 JavaScript tests, 141 bot tests and twelve publication fixtures pass. The data validators, 634-page production build and publication audit pass with 31,662 internal links and 3,262 local assets or metadata references. The actual JSON payload validates, its revision matches its content, and server HTML contains five labelled snapshot clocks. Regression cases cover leap days, UTC boundaries, elapsed windows, changed scope, partial reviews, malformed sources, unrecorded revisions and stale rollback attempts. Local browser preview remains blocked by the browser environment. Live visual and interaction checks follow the passing hosted release. Responsive breakpoints have been inspected in CSS, without claiming mobile device coverage.


## 13 September 2026, live clock verification and final review

PR #222 passed every hosted step in run 34782457263 and merged as c0436c48d4a3b011563974f21adc859631d789ce. Pages build and deployment run 34782508824 succeeded at 21:01 UTC. The live forest band shows all five clocks within the desktop page width. Initial snapshot labels become running clocks after hydration and the published review check succeeds.

Pause retained all five counter values while another future was selected. Resume caught up with current time. Enter selected Education, Space selected its optimistic outlook and all five deadlines used the correct final-year convention. Sceptical showed five open-ended labels with the original wording. Each future changed the CEO question and evidence, and pragmatic Education retained its partial-scope notice. The comparison expands to five timeline rows. The review history expands to the preserved wording, threshold, assessment, source and limitation. Browser Back restored the earlier outlook. Copy reported success and an actual paste into site search reproduced the selected URL. Searching for countdown returned Horizon as its sole result.

The final refinement makes expanded history controls say Close, labels the clock windows as editorial beside the counters and removes a build-time review decision from the static method text. That last change prevents an old summary from contradicting newer evidence fetched by an already-open page. Current decisions remain in each future’s live assessment and preserved history. The agent measure now compares results per 100 cases, giving the tenfold design question a consistent baseline.

Horizon validation, all eighteen focused date/history/bookmark tests, the production build and the complete 634-page publication audit pass after these refinements. Hosted checks remain required before the final merge. The already-open agent/optimistic view is retained for the final publication-refresh check. The reviewed dates and evidence are unchanged. Desktop rendering and keyboard interactions were checked, while responsive CSS inspection is not presented as a mobile device test. The recurring loop remains disabled.


## 13 September 2026, published-update verification and the last layout fix

PR #223 passed hosted validation in run 34783011652 and merged as fe8966567b88278985a888dab71fbf54c65102f8. Pages run 34783068673 deployed successfully at 21:12 UTC. The agent/optimistic page left open from the earlier release still showed its old success measure. Its Check for a new review action fetched the new measure per 100 cases, announced the published data update and preserved both Agents at work and Optimistic. The page was not reloaded. This verifies delivery of a published briefing update, while date-movement and rollback cases remain covered by the regression fixtures. No date revision was invented for this check.

The reloaded page showed Close for its expanded September history entry and the corrected static method explanation. The final CEO briefing screenshot exposed a layout defect: the flex row could shrink the decorative 90 until its digits wrapped vertically. The final CSS prevents that numeral from shrinking or wrapping and allows the adjacent briefing column to wrap normally. The browser did not expose a mobile viewport, so narrow breakpoints remain a CSS review rather than a device test.

The checkpoint records the verified clock releases and clears active work for handover. The recurring loop remains disabled. The final layout change still goes through the normal production build, publication audit and hosted checks before release.

## 15 September 2026, making the days unmistakable

The maintainer asked for the large number of days to be the centrepiece of each countdown, and authorised useful companion improvements. Each dated card now reads as a day count followed by its destination: the scenario window opening, the window closing or the scenario deadline. Hours, minutes and seconds are smaller. A final partial day displays <1 day, with an accessible label of “Less than 1 day”. Existing UTC arithmetic, inclusive final years, pause/resume, undated outlooks and elapsed-window review states are preserved.

The review line now explicitly says Window unchanged, Deadline unchanged or Still undated, followed by Reviewed and the actual evidence date. The clock note distinguishes time counting down from evidence moving the target. No scenario date, source or historical review was changed.

Copy briefing complements the existing shareable view link. It includes the selected outlook, original date wording, threshold and applicable scope, assumptions, next-90-days move, success measure, assessment and every primary source with its limitations. It carries the selected future’s actual review date and the illustrative-scenario qualification. Clipboard failures expose selectable text. Selection changes, browser history and published data revisions clear stale copy feedback.

Local validation passes: 123 JavaScript tests, 141 bot tests, twelve publication fixtures, all data validators and the 634-page production build. The publication audit passes 31,662 internal links, 3,262 asset and metadata references and 393 search entries. An independent review found no must-fix issue. The supported browser cannot open the local preview (ERR_BLOCKED_BY_CLIENT), so live layout and interaction checks follow the gated deployment. Narrow CSS wrapping was reviewed without claiming a mobile device test. The recurring improvement loop remains disabled.

## 15 September 2026, days release verified live

PR #225 passed every hosted validation step in run 35014721692 and merged as fa54dbd0c1a5298c300316dc44692e86d834c7c3. Pages run 35014825378 completed successfully at 19:39 UTC. The remote feature tree matched the locally tested tree exactly.

The live desktop page shows prominent day totals, quieter residual times, explicit countdown destinations and the recorded 13 September evidence date. All five pragmatic clocks name the window opening. Optimistic clocks name their deadlines and retain inclusive final years. Sceptical clocks remain open-ended with Still undated review labels. Pause retained the five displayed times while Enter selected Education. Resume returned the clocks to running. The default agent view was restored at the end.

Copy briefing reported success for pragmatic Education, and changing the outlook cleared that message. The accompanying regression tests cover every selected action, the education scope qualification, per-future dates and complete source findings and limitations across all 15 briefings. The browser’s virtual clipboard returned no data and rejected the independent paste action, so an actual pasted-content check is not claimed. A temporary local validator field used for that check was restored. No external message or model request was sent.

The page was visually inspected on desktop. Responsive CSS was reviewed, but no mobile device or viewport test was available. The checkpoint records these limits, clears active work and leaves the recurring loop disabled. This final handover only updates the records.


## 15 September 2026, clocks for our own predictions

The maintainer clarified that the clocks must count towards our predictions. The previous clocks counted to illustrative scenario boundaries, which did not make an editorial call. The main Horizon page now publishes five explicit forecasts: routine software delivery by the end of 2027, repeatable business agents by 2028, durable tutoring gains by 2029, and our defined general-intelligence and adaptable commercial-robot milestones by 2031. These are our judgements, not years calculated by the sources or claims of consensus.

Each prediction records its complete milestone, year-end deadline, resolution criteria, reasoning, uncertainty, earlier/later signals and primary evidence with limits. Source dates were checked, including the 15 September Salesforce and Agility announcements. Independent editorial review strengthened robotics criteria to require a shared general-purpose control model and new tasks without task-specific control code, preregistered AGI evaluation rules, and comparable non-AI controls in education trials. The numerical resolution thresholds are clearly our own definitions. No old illustrative window is retroactively presented as a prediction.

A new append-only prediction history and data endpoint support the main page. Countdown arithmetic includes the whole final year, preserves a partial final day and asks for review after expiry. A deadline cannot declare success automatically. Published updates preserve selection and reject rewritten or rolled-back history. Old outlooks, their sources, histories and exported links remain at /horizon/scenarios/. Homepage, search and the text edition derive current predictions from the same history. Prediction briefings include the exact test, uncertainty and every source limitation.

Local validation passes: 134 JavaScript tests, 141 bot tests, twelve publication fixtures, all data validators, and the 635-page production build. The publication audit checks 31,768 internal links, 3,268 asset/metadata references and 399 search entries with no errors. Independent UI review checked refresh, browser history, clipboard races, keyboard controls and preserved snapshots, and prompted a direct jump to selected details for narrow layouts. The supported local browser preview remains blocked; gated release and live verification are next. Mobile device coverage and an independent clipboard paste remain unclaimed. The recurring improvement loop remains disabled.


## 15 September 2026, our predictions verified live

PR #227 passed all hosted validation steps in run 35020999034 and merged as 114c082d239238ebf610166b1b966dcedad19f6f. Pages run 35023866953 completed successfully at 21:09 UTC. Its remote tree exactly matched the locally tested tree. The final publication audit checks 31,770 internal links and 3,268 assets or metadata references across 635 pages, with no errors.

The existing agent/pragmatic URL now shows our own agent prediction by end-2028. Live desktop screenshots show five prominent day counts with a published forecast year and full milestone on every card. Enter selected Education while the paused times stayed unchanged. Its criteria expanded to the complete trial, control and delayed-assessment requirements. Prediction history expanded to the first call, original criteria, rationale and sources. Robotics, Software creation and General intelligence selected their correct details; browser Back restored Software and resume restarted the clocks. The scenario comparison remains separate, switches to the five original sceptical outlooks and links back to our predictions. The selected-prediction jump reaches a readable detail panel beside the 90-day brief.

Clipboard writes in this browser could remain pending without a status response. The final refinement immediately shows Copying and exposes selectable text if the write has not completed within 1.5 seconds; stale selections still cannot receive earlier copy feedback. The production build and publication audit pass for this refinement. Hosted validation and final fallback verification follow. An actual clipboard paste and mobile device coverage remain unclaimed. The checkpoint records the verified feature deployment and leaves the recurring loop disabled.


## 15 September 2026, repairing Feral scroll access

The maintainer reported text running off the bottom of Feral. Drift reproduced the failure in the live browser: the document was taller than the 936px viewport, the ending extended below it, and a wheel scroll left scrollY at zero. Drift and Echo both set body overflow to hidden. Drift also placed a touch-action:none canvas underneath pointer-transparent text, preventing a vertical touch swipe from scrolling even if it missed every star.

Both pages now allow vertical document scrolling. Their independent fixed controls and navigation are gathered in one flex dock. The dock measures its actual height and reserves that space beneath the story, including wrapped controls, font changes and safe-area padding. Its height is capped on short viewports with its own overflow, so it cannot take over the screen. The other Feral pages already use scrollable document flow.

Drift permits vertical touch panning and pinch zoom. Mouse dragging and horizontal touch dragging remain, and the existing two ending buttons are available to touch and keyboard visitors. A cancelled touch drag has no fling velocity. Visible keyboard focus and 44px button targets accompany the controls. Independent review caught and resolved the dock's Astro-scoping box-sizing issue and touch cancellation behaviour.

Local validation passes all 134 JavaScript tests, 141 bot tests, twelve publication fixtures and all data checks. The 635-page production build and audit pass 31,770 internal links and 3,268 asset or metadata references. Local preview access remains blocked by the browser environment, so the full-ending layout and scroll checks follow the gated deployment. No mobile-device test is claimed. The recurring loop remains disabled.


## 15 September 2026, Feral scrolling verified live

PR #229 passed hosted validation run 35025780297 and merged as 691a22f9bacf8859af31047d18693219cac78ffa. Pages run 35025879272 completed successfully at 21:30 UTC. The remote source tree matched the tested local tree.

Echo's reveal control exposed the full transmission, and a wheel scroll reached scrollY48. Drift's full ending reached scrollY484. Both final paragraphs ended around y825, above the dock at y872, with 96px of reserved bottom padding. Desktop screenshots confirmed readable final lines, canvas rendering and separated navigation. Drift's computed touch action is pan-y pinch-zoom and both bodies use vertical overflow auto. A cached Drift navigation initially retained the earlier page; a normal reload received the fix.

The live review also exposed an older Drift bug: both inherited clusters arrive outside the refusal band, so its timer selected refusal before the visitor could use the new direct choices. The final guard waits for an actual star grab before physics can commit an ending; buttons still choose directly. Independent review confirmed the counter initialises before the animation loop and reduced-motion behaviour is preserved. Production build and publication audit pass for this refinement, with hosted checks and live direct-choice verification following release.

Narrow wrapping, short-screen caps and touch cancellation were reviewed in source. No mobile viewport/device is exposed by this browser; its zoom shortcut left viewport dimensions unchanged. No mobile-device test is claimed. The checkpoint records the verified scrolling release and leaves the recurring loop disabled.


## 15 September 2026, moving recurring work into the cloud

The maintainer turned off the Linux/OpenClaw host and requested a Feral run plus recurring operation of the whole site. Three cloud tasks were created and confirmed enabled: daily maintenance around 08:00 Europe/London from 16 September, a Feral council on Tuesday and Friday afternoons from 18 September, and an evidence review on Monday afternoons from 21 September. The afternoon starts are around 15:00. All three use flexible start windows within an hour. The old overnight task stays paused.

The existing GitHub price snapshot remains at 05:30 UTC and has a successful scheduled run on 15 September. The old Feral Action ran that day and passed council and validation, then failed publishing. Its log was unavailable through the connected API, so the cause is unconfirmed. Recurring Feral now uses independent Codex director, builder and critic agents with the same constitution and trusted gate, followed by normal checked PR publication. The Claude Code workflow is retained as manual-only and defaults to propose, avoiding a second scheduled generator.

Pipeline now distinguishes the four current schedules from the six inactive Python content timers and their unchanged historical records. News and Radar remain archives. The legacy Horizon bot does not maintain the five new predictions. The new evidence task explicitly reviews their criteria, primary sources and counterevidence while preserving history. No execution records or costs were fabricated for future tasks. Operating instructions remove the expired overnight deadline and document ownership, overlap checks, bounded runs and honest publication evidence. A real Feral cycle is being built and reviewed separately, so maintenance files cannot leak into its scoped diff.

Validation passed: 134 JavaScript tests, 141 bot fixtures, 12 publication fixtures, all content/model/Horizon validators and a 635-page build. The offline audit checked 31,773 internal links and 3,268 asset/metadata references with no errors. Independent review found no required changes to scheduling ownership or publication safeguards. Hosted checks, deployment and live schedule verification follow this commit.


## 15 September 2026, cloud schedule and Feral cycle verified

PR #231 passed hosted run 35028279865 and deployed in Pages run 35028420982. Live Pipeline shows daily maintenance, Tuesday/Friday Feral, Monday evidence review and the existing daily price job. First future start dates are explicit. Six legacy Python timers are marked inactive and their historical records remain unchanged. A fresh task lookup confirms all three new cloud schedules enabled and the expired overnight task paused.

PR #232 completed the requested real Feral run. A Codex director chose Pocket Weather, a separate builder implemented the fictional twelve-hour weather toy, and an independent critic returned PASS on attempt 1. The final diff contains only the new route, appended manifest entry and appended cycle 6 ledger entry. The trusted gate passed against the exact current base and candidate. All 134 JavaScript tests, 141 bot tests, 12 publication fixtures and data validators passed. The final 636-page build/audit checked 31,779 internal links and 3,270 assets/metadata references with zero errors. Hosted run 35028587178 and Pages run 35028658302 both succeeded.

Live Pocket Weather inspection verified assigning Sun to the first hour, Enter-key stepping, timed playback advancing to hour 7, pause persisting between checks, stepping through hour 12, the completion line and reset restoring the original Fog plan. The page scrolled to 803 px and the entire footer remained reachable. No desktop horizontal overflow was observed. The new creation was checked in the Feral gallery and its cycle 6 ledger. The returning gallery initially showed its cached five-room page; a normal reload showed six creations and the new dated PASS. No mobile-device test is claimed. The three future cloud schedules have not yet had their first execution.


## 15 September 2026, counting prediction days

The maintainer clarified that the Horizon clocks should count down the days to each prediction and recalculate when the estimate changes. The matching hours, minutes and seconds were an unhelpful consequence of every target ending at midnight UTC. Main Horizon now shows days only. It recalculates just after UTC midnight, on return to the page and when a new published review arrives. The per-second animation and pause control are removed from this page. The alternative scenario experience is preserved.

A review now reports its target movement as a number of days earlier or later. This compares old and new target dates, excluding ordinary time passing. Milestone changes keep their separate label. The selected prediction explains what sets its day count and whether evidence has moved it yet. Initial forecasts and their entire published history remain unchanged. AGI and robotics still share a day count because their current forecasts share a date.

The underlying helper had discarded the month/day and the validator only admitted year ends. The helper now respects any valid ISO target date through the end of that UTC day. Display, history, copyable briefings and text export preserve a revised date. This allows a future justified review to move by days rather than forcing a whole-year jump. It does not turn broad initial forecasts into claims of day-level precision. Copied briefings include the displayed remaining days with their UTC snapshot time.

Validation passes 138 JavaScript tests, including 14 prediction cases. A 37-day earlier fixture affects only its selected counter, while a separate elapsed day stays out of the recorded evidence shift. Leap days, exact non-December dates, invalid dates, history rewrites, scope changes and the midnight + 1 ms boundary are covered. Independent review caught a rounded-second bug that could otherwise hold the previous day total for a whole day with the new update cadence. All 141 bot tests, 12 publication fixtures, data validators and the 636-page build pass. The offline audit checks 31,781 internal links and 3,270 assets/metadata references with no errors. Built HTML contains five day counters and no sub-day counters. Hosted release and live inspection follow.


## 15 September 2026, day counters verified live

PR #234 passed hosted run 35030633590 and deployed successfully in Pages run 35030734134. A normal reload showed five day counters and no hours/minutes/seconds display. The recorded counts were 1,933 for AGI and robotics, 838 for agents, 472 for software and 1,203 for education. The two matching totals reflect their unchanged shared target, which the page now explains.

Enter-key selection opened Software creation with its matching 472-day explanation and 2027 target. A manual review check completed and kept that selection, with the actual original history still visible. Clipboard writing used the selectable-text fallback. Its text contains the correct 472-day count, UTC snapshot, target date, criteria and evidence. No successful clipboard paste is claimed. The live layout had no horizontal overflow. The existing forecast history remains untouched, and the next evidence review can record a justified date change and its numeric day movement.
