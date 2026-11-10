# TODOS

Deferred work surfaced by reviews. Each item has enough context to pick up cold.

Item numbers are stable references (commit messages and PRs cite "TODOS #N"), so
shipped items are recorded in the ledger below rather than renumbered away.

---

## Shipped

- **#1** — `confidence_last_reviewed` hard-fail at 180 days. Validator now errors
  (not just warns) past 180d; 90d warning retained for the 90–180d band. (PR #146)
- **#5** — Human-review surface for bot proposals: chose **bot-opens-PRs**, now
  documented in CLAUDE.md (Horizon Map section). horizon_bot has opened daily
  Now-proposal PRs since #112 (2026-04-22); Next flags / Past candidates still go
  to the `~/.softcat-bot-staging` file. (this housekeeping PR)
- **#7** — `radar_bot.py` orphan accumulation. `prune_orphan_files` drops
  day-files that aged out of the manifest, staged via `git rm`. (PR #143)
- **#8** — Eager `import.meta.glob` in radar pages + search index. Switched to
  lazy globs; search bounded to the visible window. (PR #143)
- **#9** — `radar_bot.py` fragile `git stash pop` under concurrent CI. Now commits
  before syncing, with `pull --rebase --autostash` + bounded push retry. (PR #143)
- **#10** — Lane-specific `signal_type` / `confidence` constraints (past/now/next
  subsets). (PR #145)
- **#11** — `evidence` / `origin` ref-type alignment: `external` refs must be URLs;
  `origin.type` aligned to evidence's full vocabulary (paper/external). (PR #144)
- **#12** — Relational refines: `updated >= added`, `confidence_last_reviewed >=
  added`, debate `supporting.min(1)`. Cross-collection id uniqueness and
  cross-ref resolution were already covered by `validate-horizon-refs.mjs`.
  (PR #144) — *residual:* the `radar/[date].astro` missing-day-file build-warning
  noted in this item's original context is still open (see #13).

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

## 6. Theme enum rebalance after 50+ entries

**What:** The horizon `Theme` enum has 16 values (`models`, `agents`, `robotics`, `interfaces`, `search`, `code`, `data`, `infrastructure`, `chips`, `regulation`, `security`, `enterprise`, `work`, `education`, `creativity`, `society`). At v1 launch with ~50 entries, distribution is unknown. Once the page hits 50+ entries, audit the distribution: some themes will be empty, some will be overloaded.

**Why:** Filter UX falls apart with empty themes (dead-end clicks) or overloaded themes (no signal). Schema-locked enums are easy to add to but hard to remove from once entries depend on them.

**Pros:** Better filter signal-to-noise. More accurate at-a-glance distribution view.

**Cons:** Requires a data migration if removing values. Needs Valori judgment on what to merge/split.

**Context:** Flagged by /plan-eng-review on 2026-04-09 (Issue C1, low confidence — judgment call). Themes are mutable in v1 because Astro Collections + Zod makes the rebalance a single edit + content migration. Don't pre-optimize before the page has real traffic patterns.

**Depends on:** 50+ entries across all lanes. Realistically 2-3 months after v1 launch.

---

## 13. Build-time warning for radar day-files missing from disk

**What:** `src/pages/radar/[date].astro` resolves the day-file via `import.meta.glob` and sets `dayData = null` when no file matches a manifest date. There is no build-time signal — the page just renders empty. A manifest entry that points at a pruned or never-written day-file should warn (or fail) at build.

**Why:** Silent empty radar pages are a quiet content failure, especially now that `radar_bot.py` prunes aged-out day-files (#7) — a manifest/disk mismatch is more likely than before.

**Pros:** Catches manifest/disk drift at build instead of in production.

**Cons:** Small, but needs a decision on warn vs fail. A pruned-but-still-in-manifest date is arguably a data bug worth failing on; a transient race might argue for warn.

**Context:** Split out of #12, where it was folded into the relational-refines batch but not actually addressed. Lives on the radar side, not the horizon schema, so it didn't fit PR #144.

**Depends on:** Nothing — can be done any time. Cheap.
