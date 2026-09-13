# Maintaining the Horizon clocks

The counters display the passage of time against published editorial scenarios.
They are not calibrated probabilities, deadlines for a visitor to act or claims
that a capability will arrive on a particular day.

## Display conventions

- All boundaries use UTC and the visitor’s device time.
- An explicit year range counts to 1 January of the first year. Inside that
  window it counts to 1 January after the final year, including the whole year.
- A “by” claim counts to the end of its named year using the same exclusive
  boundary. An elapsed boundary requests review; it never resolves a scenario.
- Indefinite wording has no numerical counter. Legacy representative `year`
  values in scenarios.json do not supply targets.
- Pause freezes the counters and resume catches up. Hidden pages stop ticking.
  Server output is labelled as a dated snapshot until hydration succeeds.

## Publishing a real review

1. Inspect the primary evidence and its limitations. Decide whether the same
   threshold has stronger or weaker support. An unchanged window is a valid
   decision. Do not change dates just to create movement.
2. Update the relevant definition or timeframe in `scenarios.json` only when
   that review justifies it. Update its matching `outlook-review.json` record
   with the exact current timeframes, assessment and source findings/limits.
3. Append a `review` event to `clock-history.json`. Give it a unique ID, the
   actual review date and a record for each reviewed future. Each record stores
   the exact definition, all three timeframes, the assessment as `reason`, and
   the complete evidence array. Partial reviews are supported. Set the overall
   `reviewed_at` to the latest event date; other futures retain their own date.
4. Review the corresponding question, next-90-days actions and measures in
   `decision-briefs.json`. These are planning prompts, not research findings or
   promises of tenfold productivity.
5. Run the repository gates, review the PR and publish only after hosted checks
   pass. Verify the live clocks, selected view, evidence and new history entry.

Never edit or remove a published history event. Append a correction, retaining
the previous threshold and evidence for inspection. Changing a definition is
labelled as a scope change, so it cannot masquerade as faster progress towards
the same threshold. Explicit dates can move earlier/later, widen/narrow or
become undated. Changing the stance selects a different scenario; it does not
create a historical revision.

The baseline is pinned to the original 22 April Git source. The validator checks
that snapshot and enforces an append-only prefix against tracked/published Git
history and the CI event’s base commit. Use a full Git checkout. It also requires
the latest review for each future to match the current threshold, dates,
assessment and sources. The initial 13 September review retained all 15 date
claims; no fictional movement was added to demonstrate the interface.

## Delivery to an already open page

The Astro build publishes `/horizon/clock-data.json` with a content revision.
The explorer requests HTTP revalidation on load, every five minutes while
visible and when the visitor returns to the page. It checks the complete
payload and retained history before replacing it atomically. An older cached
response cannot roll back a recorded review. Selection and URL state survive.
Failures retain the last verified review and expose a manual retry.

This refreshes published decisions. It does not scrape new research, assess
sources automatically or reactivate the disabled recurring improvement loop.
The one-second counters do not generate network traffic or screen-reader live
announcements. The visitor can pause them without losing their selected view.
