# TODOS

Deferred work surfaced by reviews. Each item has enough context to pick up cold.

---

## 1. Promote `confidence_last_reviewed` warning to hard-fail at 180 days

**What:** The build-time validator warns when a Next-lane entry's `confidence_last_reviewed` date is older than 90 days. Once editorial review cadence is proven, escalate the validator to **fail the build** at 180 days.

**Why:** v1 starts permissive to avoid false-fail builds while editorial cadence is calibrated. Once you've shown you can re-touch Next entries on a regular cycle, the validator should enforce it. Stale forecasts on a forecasting page are a credibility hit.

**Pros:** Forces sustained editorial discipline. Aligns the schema's promise with the page's actual maintenance.

**Cons:** Premature escalation breaks deploys when you genuinely need to ship while a forecast is in transition.

**Context:** Added by /plan-eng-review on 2026-04-09 (Issue 8 / Outside Voice #6). Schema field is mandatory in v1. Validator behavior is in `scripts/validate-horizon-refs.ts`. The 180-day threshold is a guess; tune after observing real cadence.

**Depends on:** Horizon Map v1 ships. Track 4-8 weeks of editorial review cadence. Decide threshold based on observed median.

---

## 2. 404 / canonical / redirect story for entries promoted to Past lane

**What:** When `horizon_bot.py` promotes a radar/news/thoughts entry to the Past canon, the original page still exists at its original URL (e.g., `/radar/2026-01-15`). The new Past presentation lives at `/horizon#past-2026-glm-5-1`. There is no canonical link, no redirect, no "see also" backlink.

**Why:** Search engines see two pages with overlapping content (the original radar entry and the Past entry referencing it). Readers landing on the radar entry have no signal that this thing was significant enough to be canonized.

**Pros:** SEO consolidation. Better reader navigation between archive and canon. Reinforces the "history writes itself from the archive" identity.

**Cons:** Touches the radar layout (need to add a "Promoted to Horizon Map" badge or footer). Decision required on canonical direction (does the radar entry point to horizon or vice versa).

**Context:** Surfaced by /plan-eng-review outside voice on 2026-04-09 (Outside Voice #10). Not a v1 blocker, but worth doing within the first month after horizon launches. The `ProvenanceBadge.astro` component already exists and could be reused on the radar side.

**Depends on:** Horizon Map v1 ships. At least 5-10 entries have actually been promoted before this is worth designing.

---

## 3. Buttondown integration for AI Horizon Map updates (v1.5)

**What:** Create a new Buttondown list "AI Horizon Map updates" and wire a weekly send template that auto-generates from the Horizon shift log. Add the subscription CTA to the horizon page footer (`<HorizonCTA>`).

**Why:** Email capture funnel for the page's most engaged readers. Originally Step 9 of the v1 sequence; deferred because committing to a weekly cadence before knowing whether the bot reliably produces shift content was a credibility risk.

**Pros:** Predictable distribution channel. Brings repeat visitors back without algorithmic dependency.

**Cons:** A weekly send with empty content damages the list more than not having it. Need to verify cadence is real before launching.

**Context:** Deferred by /plan-eng-review on 2026-04-09 (Issue 9 / Outside Voice #11). Decision criterion: after 4 weeks of horizon launch, if the shift log has populated content in at least 3 of the 4 weeks, ship Buttondown. Otherwise defer further or switch to "when there's something to say" cadence. Existing Buttondown integration pattern is in commit `8f64373` (the dispatch list).

**Depends on:** Horizon Map v1 ships. 4-week observation window. Then schedule the integration sprint.

---

## 4. Bot auto-confidence-shift logic for Next-lane entries (v2)

**What:** Today `horizon_bot.py` Job 2 (Next confidence shifts) only **flags** candidates for human review. Build the actual auto-shift logic: when supporting/contradicting evidence accumulates against a Next entry, the bot proposes a confidence change ('emerging' → 'confirmed' or 'emerging' → 'contested') with a written rationale.

**Why:** The design doc calls this "the hardest engineering problem in the whole design" and explicitly punts it to v2. It's the difference between a forecasting page that happens to have confidence labels and a forecasting page where confidence is a tracked, evolving property.

**Pros:** Closes the loop on the page's central proposition (confidence as first-class). Reduces editorial burden on Valori.

**Cons:** Genuinely hard to design well. Risk of bad auto-shifts undermining trust faster than no auto-shifts.

**Context:** Punted in design doc 2026-04-09 (line 248). Surfaced again by /plan-eng-review (Issue 8). Likely needs: a heuristic counting recent radar/news/thoughts entries that support or contradict each Next entry's themes, weighted by recency and relevance. Probably also needs an LLM call per candidate for the rationale text. Should always remain human-reviewed (bot proposes, Valori approves) — no direct writes.

**Depends on:** v1 ships and runs for at least a month so there's enough archive data to test heuristics against.

---

## 5. Pick the human-review surface for bot proposals

**What:** `horizon_bot.py` writes proposals to `~/.softcat-bot-staging/horizon-bot-proposals.json`. Valori needs a way to review these. Two options on the table: (a) a thin Astro admin page only built locally, or (b) `gh pr` from the bot for the data file diffs. Pick one.

**Why:** Without a clear review surface, proposals pile up in the staging file and never get applied. The whole bot-proposes / human-promotes flow stalls.

**Pros:** Closes the loop on the v1 bot integration. Makes the Past lane self-replenishing.

**Cons:** Both options have real costs. Admin page is more code to maintain. PR-from-bot needs `GITHUB_TOKEN`, `gh` CLI in the bot environment, and a review discipline.

**Context:** Punted in design doc 2026-04-09 (line 224) to "week 2." /plan-eng-review left it as a punt because the choice doesn't affect schema or validator design. Decide once `horizon_bot.py` has actually generated its first batch of real proposals — the volume and shape of those proposals will make the choice obvious.

**Depends on:** Step 6 of v1 sequence (horizon_bot.py first run produces proposals).

---

## 6. Theme enum rebalance after 50+ entries

**What:** The horizon `Theme` enum has 16 values (`models`, `agents`, `robotics`, `interfaces`, `search`, `code`, `data`, `infrastructure`, `chips`, `regulation`, `security`, `enterprise`, `work`, `education`, `creativity`, `society`). At v1 launch with ~50 entries, distribution is unknown. Once the page hits 50+ entries, audit the distribution: some themes will be empty, some will be overloaded.

**Why:** Filter UX falls apart with empty themes (dead-end clicks) or overloaded themes (no signal). Schema-locked enums are easy to add to but hard to remove from once entries depend on them.

**Pros:** Better filter signal-to-noise. More accurate at-a-glance distribution view.

**Cons:** Requires a data migration if removing values. Needs Valori judgment on what to merge/split.

**Context:** Flagged by /plan-eng-review on 2026-04-09 (Issue C1, low confidence — judgment call). Themes are mutable in v1 because Astro Collections + Zod makes the rebalance a single edit + content migration. Don't pre-optimize before the page has real traffic patterns.

**Depends on:** 50+ entries across all lanes. Realistically 2-3 months after v1 launch.

---

## 7. No file deletion in `radar_bot.py` — orphan accumulation

**What:** `bot/radar_bot.py` never unlinks `src/data/radar/*.json` files. The only retention mechanism is the manifest cap (`MAX_ARCHIVE_DAYS`, line 60), and that just trims the `dates` list inside `index.json`. When the manifest cap was 30 there were already 15 orphaned files on disk (45 files vs 30 manifest entries). With the cap now at 365, the disk grows unbounded forever.

**Why:** Eventually this matters. The Astro radar pages and search index use `import.meta.glob` from disk (see TODO 8), so orphaned files affect build time and bundle size even though they're not in the manifest. Long-term this is a death-by-a-thousand-cuts problem: build slower, repo bigger, deploy artifact larger, no single thing that's catastrophic.

**Pros:** Bounded disk growth. Faster builds over time. Smaller deploy artifacts. The horizon bot's directory-scan promotion logic (Step 6a) gets a smaller search space.

**Cons:** Deletion is irreversible (well, recoverable from git history but awkward). Needs a clear retention policy: how old before delete, what gets preserved (the `MAX_ARCHIVE_DAYS=365` value defines this). Also: orphaned-but-promoted entries — if a radar file got promoted into `past.json`, can it be safely deleted? Answer is yes (the promoted Past entry is the canonical version) but the logic needs care.

**Context:** Surfaced by `/ship` adversarial review on horizon-prereqs (PR #90), 2026-04-10. Pre-existing issue, not caused by the prereqs PR — the cap bump just made the eventual impact larger. The fix is small: add an `unlink_old_files` step in `save_and_push` that deletes files whose date is older than `MAX_ARCHIVE_DAYS` from today, AFTER the manifest is updated. Use `git rm` or `git add` so the deletion lands cleanly.

**Depends on:** Decision on retention policy. Probably also: confirmation that the horizon bot's directory-scan logic (Step 6a) is the only consumer that cares about old files.

---

## 8. Eager `import.meta.glob` in radar pages and search index loads everything

**What:** `src/pages/radar/index.astro:8`, `src/pages/radar/[date].astro:19`, and `src/pages/search-index.json.ts:65` all use `import.meta.glob('../../data/radar/????-??-??.json', { eager: true })` which loads **every JSON file physically present on disk** at build time, not just files in the manifest. As the radar archive grows (whether from the new 365-day manifest cap or just orphan accumulation), the build's memory footprint, bundle size, and search index file all grow with it.

**Why:** The search index in particular is loaded client-side on Cmd+K. Today it's small. Over a year of accumulating radar entries plus all the other site content, it could grow to several megabytes — slow first-load, slow first search. The radar page builds will also slow proportionally.

**Pros:** Bounded build time. Bounded search index. Bounded memory usage during build.

**Cons:** Two valid fixes — (a) filter the glob results against `manifest.dates.slice(0, RADAR_VISIBLE_DAYS)` so only visible-window files are loaded, or (b) decouple the search index from radar entirely (separate eager glob, separate filter logic). Each requires a small refactor of how the radar pages compose data.

**Context:** Surfaced by `/ship` adversarial review on horizon-prereqs (PR #90), 2026-04-10. This is technically a pre-existing issue but the horizon work makes it more visible because the architectural intent is now "the disk grows for the bot." Note that PR #90 already introduced `RADAR_VISIBLE_DAYS=30` in `src/utils/radar.ts` to bound route generation — extending the same constant to the eager globs is the natural next step.

**Depends on:** Decision on whether the search index should include radar items at all. If yes, what's the cap? `RADAR_VISIBLE_DAYS` or something different?

---

## 9. `radar_bot.py` `git stash pop` after `git pull --rebase` is fragile under concurrent CI

**What:** `bot/radar_bot.py:save_and_push` does `git stash --include-untracked` → `git pull --rebase` → `git stash pop` → write → `git add` → `git commit` → `git push`. The `git stash pop` is run with `check=True`, so if it can't reapply cleanly (e.g., the rebase pulled in conflicting changes), the bot crashes and no radar file gets written that day. With CI checkout now using `fetch-depth: 0` (PR #90), every bot push triggers a full-history checkout in the deploy job, widening the window where a bot push can race with the previously-triggered workflow. Pre-existing issue, made marginally more visible by the deploy.yml change.

**Why:** A single failed `git stash pop` results in a missing day in the radar archive. Cumulative reliability matters when the page's whole identity is "the machinery is the story" — a visible gap in the daily output is a credibility hit, even if it's mechanical.

**Pros:** More reliable daily ingestion. Better story for the activity ticker / pipeline page.

**Cons:** The fragility is inherent to mixing untracked-file operations with rebase. Real fix is probably: don't stash, just `git pull --rebase` cleanly; if there are uncommitted local changes, abort and alert (a daily run shouldn't have local uncommitted state). Or use `git fetch` + manual merge instead of pull-rebase.

**Context:** Surfaced by `/ship` adversarial review on horizon-prereqs (PR #90), 2026-04-10. The reviewer rated this 7/10 confidence — the failure mode is real but the trigger requires concurrent runs which is uncommon. Worth fixing once the horizon bot lands and adds another daily push to the same workflow.

**Depends on:** Step 6 of v1 sequence (horizon bot lands and adds a second daily push that could race with the radar bot).

---

## 10. Lane-specific `signal_type` / `confidence` constraints

**What:** Today `horizonLaneBase` (`src/content.config.ts`) lets any lane use any `signal_type` (`event`, `trend`, `forecast`, `debate`, `inflection`, `warning`) and any `confidence` (`confirmed`, `emerging`, `contested`, `speculative`). A `past` entry with `signal_type: forecast` validates cleanly. A historical turning point with `confidence: speculative` validates cleanly. Both are nonsense.

**Why:** The schema's job is to encode "what makes sense" so hand-edited or bot-proposed data can't drift into incoherent shapes. Lane-by-lane the meaningful subsets are smaller:
- past → `signal_type: 'event' | 'inflection'`, `confidence: 'confirmed'`
- now → `signal_type: 'event' | 'trend' | 'inflection' | 'warning'`, any confidence
- next → `signal_type: 'forecast'`, any confidence

**Pros:** Catches semantic drift at build time. Clearer intent for any new contributor (the schema documents the meaning of each lane).

**Cons:** Real risk of false-fail. Edge cases: a Past entry that was once `emerging` and is now retrospectively `confirmed` — should the schema allow `confidence: emerging` on past? Probably no (past is the canon). What about a `now` entry that includes a forecast inside it ("X is happening, and it implies Y will follow") — `signal_type: forecast` on now? Probably yes. Not all combinations are obvious.

**Context:** Surfaced by `/ship` testing specialist + adversarial subagent on horizon-schema (PR #91), 2026-04-10. Both reviewers flagged this independently. Deferred from PR #91 because it needs design judgment, not mechanical tightening. The right approach is probably: write down the allowed combinations as a table first, decide each ambiguous case, then encode.

**Depends on:** Real Now / Next / Debates seed data exists (Step 3b–3e of v1 sequence). Without seeing what real entries actually look like, the design decision is too abstract to make well.

---

## 11. `evidence.type` / `origin.type` discriminated unions and set alignment

**What:** Two adjacent issues in `src/content.config.ts`:

(a) `horizonEvidence.ref` is a plain string regardless of `type`. A `type: 'radar'` evidence entry should have `ref` matching a radar slug; a `type: 'external'` should have `ref` matching a URL. Today both validate as `z.string().min(1)`.

(b) `horizonOrigin.type` is `'radar' | 'news' | 'thought'`, but `horizonEvidence.type` includes `'paper'` and `'external'` on top. So a Past entry promoted from a paper or external source can't have its origin recorded — the schema rejects it.

**Why:** (a) Catches a real footgun: typing a URL into a `radar`-type ref or vice versa silently ships. (b) Either the inconsistency is intentional (only internal lanes can be promoted to Past) and should be documented, or it's accidental and should be aligned.

**Pros:** Eliminates a class of typos. Forces an explicit decision on whether papers/external sources are valid origins.

**Cons:** Discriminated unions in Zod are slightly more verbose. The (b) decision needs human judgment — is "promoted from a paper" a real workflow we want to support, or is the Past lane strictly downstream of the site's own content?

**Context:** Surfaced by `/ship` adversarial review on horizon-schema (PR #91), 2026-04-10. Both issues are low-impact today because no Now / Past / Next entry currently has any evidence or origin entries. They become real when bot proposals start including provenance.

**Depends on:** First batch of bot-generated promotion proposals (Step 6a of v1 sequence). Real proposals will surface what kinds of provenance are actually being recorded.

---

## 12. Small schema relational refines pending the cross-ref validator

**What:** A handful of small schema improvements were deferred from PR #91 because they're either dependent on the build-time validator script (Step 4.5 of v1 sequence) or because they add complexity that's hard to justify before there's real data to validate against:

- `horizonLaneBase`: `.refine(d => !d.updated || d.updated >= d.added)` — catches backdated `updated` timestamps
- `horizonNext`: `.refine(d => d.confidence_last_reviewed >= d.added)` — catches a `confidence_last_reviewed` set before the entry existed
- `horizonDebates.for/against.supporting`: `.min(1)` — catches debate sides with no supporting evidence (currently allowed)
- Cross-collection ID uniqueness — same id can exist in `now.json` AND `now-archive.json`, no schema-level check
- `related[]`, `evidence.ref`, `origin.ref` cross-reference resolution — typo'd or dangling refs validate at schema level

**Why:** Each one catches a real silent failure. None are blocking until the lanes get seeded with real data.

**Pros:** Schema becomes the canonical definition of "what's valid." Reduces human verification burden on each edit.

**Cons:** The cross-collection and cross-reference checks need a separate validator script (Step 4.5), not Zod, because Zod schemas are per-collection. The relational refines need careful test data to verify they don't false-fail.

**Context:** Surfaced by `/ship` testing specialist + adversarial subagent on horizon-schema (PR #91), 2026-04-10. Deferred together because they're a coherent batch of "tighten once Step 4.5 lands and we have real data." Also worth noting: there's a `dayKey` undefined edge case in `src/pages/radar/[date].astro:21` (when a manifest entry references a missing data file) that should warn at build time — small enough to fold into this batch.

**Depends on:** Step 4.5 of v1 sequence (the cross-ref validator script) lands. Real data exists in at least one of `now.json` / `next.json` / `debates.json` / `scenarios.json` so the refines can be tested against something other than empty arrays.
