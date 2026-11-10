# SOFT CAT site-wide health and freshness audit

**Audit opened:** 9 November 2026, Europe/London  
**Scope:** Public routes, shared components, page families, dated content, SEO/discovery, feeds, and operating claims.  
**Evidence standard:** A built page is not necessarily a working interaction. An accessible link is not proof that its source is current.

## Baseline and what the automated gate can establish

Before changes, the latest successful main deployment was commit
`2117355d87d7ebb4d4eb47c415d5d608ca7a7dd3`,
[Pages run 42707125740](https://github.com/valorifutures/softcat.ai/actions/runs/42707125740).

The trusted offline build audit reported:

| Measure | Observed baseline |
| --- | ---: |
| Built HTML pages | 647 |
| Internal links checked, including fragment targets | 33,384 |
| Local assets and metadata references checked | 3,328 |
| Search entries | 412 |
| Published/draft content records audited | 183 |
| Explicit retirement notices | 227 |
| Offline publication errors | 0 |

The validator checks emitted HTML, duplicate IDs, nested links, shared-layout headings, local links, fragments, sitemap and feed XML, published/draft/retired routes, and local assets. It does **not** fetch outbound websites, browse on a phone, execute browser JavaScript, confirm DNS resolver CORS or verify every historic factual assertion. This is a source/build audit with a bounded published-site check, not a full independent end-to-end browser audit.

## Findings and decisions by visitor journey

| Area | Finding as observed in repository | Action | Evidence still needed |
| --- | --- | --- | --- |
| Homepage and first clicks | Useful tool cards and current Horizon targets are present. Homepage Feral spotlight featured September's Off Register while newer rooms existed. | Keep the intentional Off Register artwork and link dynamically to the latest Feral creation. | Visual mobile and keyboard check. |
| Header and global search | Main navigation reaches research, Horizon, tools, recipes, notebook and Feral. Search index is generated, but shortcuts missed the new domain tool. | Add domain checker shortcut and update search hint. | Test search overlay with mouse and keyboard in a live browser. |
| Footer | RSS route existed but read like a live news feed. The new domain tool was absent. | Rename to “Published work (RSS)” and feature Domain checker. | Test real clicks and subscriptions. |
| RSS feed | The original XML listed archived news and earlier thoughts. Recent Feral releases were missing. | Feed now lists dated published Feral creations, thoughts/field notes, and historical digests, ordered by record date. | Test through a real feed reader. Feed dates for Feral are recorded calendar dates at 00:00 UTC, **not** verified exact publication times. |
| News | Latest published digest is 3 July 2026; index said “News & Updates” without a clear archive notice. Historic editorial statements might read as today's news. | Visible archive/date wording on index and each article. Preserve originals and links. | Independently recheck any specific historic claim before using it today; do not rewrite historical reports as current. |
| Radar | Most recent product round-up was 3 July 2026. “Curated daily”, “Today's picks” and “Check back tomorrow” implied the retired bot still ran. | Label index and dated editions as archived. Remove daily and today wording; show last recorded date. | Recheck outbound product/vendor links before recommending them. |
| Notebook | Latest dated field notes had been in September despite subsequent changes. | Add a genuine 9 November entry with what this audit did, its reasons and limits. | Keep the notebook tied to actual code changes, not simulated activity. |
| Feral | Eleven creations appear in the manifest through SNARL on 9 November. The ledger distinguishes critic decisions from independent browser evidence. | Promote the latest creation without changing the rooms or their historic ledger. | Physical touch/mobile and download tests remain device dependent. |
| Tools | Nine listed browser tools, including the new domain checker. The public DNS requests are intentional external requests. Model price tools use dated saved records. | New global entry points; clarify oldest/latest price checks and that they are not live quotes. | End-to-end domain request and export tests, especially blocked resolvers and browser permissions. |
| Pipeline | Cloud schedules are described but first restored unattended runs were not confirmed. Price job skipped publishing on 9 Nov because catalogue match was only 31 of 39. | Display an explicitly dated recovery / failed-price note and link to the evidence. | Verify future scheduled execution receipts and investigate eight missing model IDs. |
| Horizon | Current five predictions, evidence and dated reviews are separate from older forecasts and historic map. | No speculative target/date changes made. | Continue source-led evidence review on its own cadence. |
| Research | Offline delegation, framework recovery and authority-boundary tests are described with limited claims. | Leave recorded synthetic work unchanged. | Independent live-model comparison and reproduction are future research gates. |
| Prompts and glossary | Published templates and terms have collection metadata and generated routes. Retired templates remain on explicit noindex notice pages. | Preserve reviewed material; do not bulk regenerate unverified content. | Recheck niche source claims before any factual update. |
| Contact and privacy | Public GitHub issue templates for bug reports, corrections and experiments exist in the repo. Privacy describes local tools, OpenRouter and public DNS queries. | Preserve the existing interfaces. | A live external form/submission was **not** tested. |
| Legacy redirects | `/now`, `/status`, `/lab`, model explorer and trace/receipt routes have redirects or visible retirements. | Preserve compatibility and correction history. | Check redirect behaviour through an HTTP client if required. |
| Search, sitemap, robots, and AI export | Sitemap, feed, search index and retired routes have offline validation. The `llms.txt` index links live tools. | Add the actual publication feed to the reading index. | Crawler-side rendering/indexing is outside the offline validator. |
| Unused source and legacy bots | Legacy Python timers remain in the repository for history and are not running. A `Dispatch.astro` Buttondown form exists in source but is not visible in the main homepage. | Do not restart timers or activate dormant subscription without confirmation. | Audit any dormant service integration before deletion or revival. |

## Principles used

1. **A stopped feed is an archive.** Keep the original record and its date.
2. **Do not convert reachability into verification.** A 200 response and a passing build do not establish truth or usability.
3. **The site must lead to something useful.** Make the domain checker, experiments and receipts discoverable.
4. **Dates belong to evidence.** Never claim a maintenance run or price check occurred solely because the site rebuilt.
5. **Keep rollback simple.** One reviewable site-maintenance branch, no changes to the independent Feral creative ledger, historic Horizon reviews or price guard.

## Remaining checks, in practical order

- **P1:** Verify the new Domain & Outage Checker in a real browser on desktop and mobile. Check actual Cloudflare/Google DNS responses, partial failure, security warning, exported text, clipboard and downloads. A DNS response never proves the website is up.
- **P1:** Review the eight model IDs missing from the 9 November OpenRouter price catalogue, and preserve the fail-closed publishing guard.
- **P1:** Inspect RSS in at least one independent subscription reader and confirm it shows current field notes and Feral dates without a false daily promise.
- **P2:** Test global search, mobile navigation, footer, keyboard focus and layout across narrow widths. The static build cannot test these interactions.
- **P2:** Sample external links, grouped by current use and historical citation. The many historical articles are not re-verified just because their URL works.
- **P2:** Verify the first resumed unattended maintenance and Feral runs using actual task and GitHub receipts.
- **P3:** Review dormant `Dispatch.astro` / Buttondown integration and retired scripts against the privacy description before removing or reactivating them.

**Status of this file:** An audit of repository source and the last successful hosted build, with explicitly bounded follow-up work. The final PR checks and Pages publishing receipts belong in [the improvement log](improvement-log.md). Record those only after the runs complete.


## 9 November release receipt

The first audit release was merged in [PR #282](https://github.com/valorifutures/softcat.ai/pull/282) as
`d4173a36cf10495710363a6ce6c6a2e82b95a57c`. [The exact-head PR validation](https://github.com/valorifutures/softcat.ai/actions/runs/42714607857)
passed the production build, all required source/data checks, independent
boundary and framework-recovery CI, 225 JavaScript tests, 21 offline publication
tests and 141 bot tests. Its emitted-site audit recorded:

| Measure after first release | Verified build |
| --- | ---: |
| Built HTML pages | 650 |
| Internal links checked | 34,197 |
| Local asset/metadata refs checked | 3,343 |
| Search entries | 413 |
| Content records | 184 |
| Retirement notices | 227 |
| Offline publication errors | 0 |

The first hosted build attempt failed due to an unescaped apostrophe in an
Astro string on the Valori page. We corrected the error and ran the entire
required suite again before merge. No failed build was published.

[GitHub Pages run 42715048084](https://github.com/valorifutures/softcat.ai/actions/runs/42715048084)
completed all its validation and deployment jobs successfully at 22:50 UTC.
This is publication evidence, **not** proof that a real browser completed every
interaction. The independent visitor and RSS reader tests remain open.

### Additional discovery: legacy routes

The audit found another source-level SEO issue after the first release:
`/now`, `/status`, `/lab`, `/lab/model-explorer` and `/receipt` were
not on the explicit sitemap-exclusion list. The receipt endpoint redirects
to a retired trace demo, but it lacked a noindex marker. A follow-up focused
change excludes these redirect aliases from the sitemap while keeping them
reachable and marks the retired receipt redirect noindex. A new offline test
asserts that canonical destinations stay indexed. This is an SEO hygiene
correction, not a claim that all these routes were indexed by search engines.

### External reference sample, not a whole-site link audit

We sampled public references from the latest archived Radar edition. Manufact,
Mirrors (which redirects to mirrors.dev), Declaw Arena, ThousandEyes' outages map,
and the Cloudflare/Google DNS JSON API documentation were accessible through the
external reader on 9 November. A GitHub Enola page could not be assessed because
the reader rejected that URL as restricted. We do **not** classify that
restriction as a dead website. The historical Radar disclosure remains
appropriate: the page's original product claims have not been re-verified.
