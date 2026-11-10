# Daily price snapshots

The `Model price snapshot` workflow runs daily at 05:30 UTC. It also runs when
its workflow or refresh script changes on main, and can be dispatched manually
from GitHub Actions. The first push trigger verifies the complete publication
path after installation. It uses OpenRouter's public models catalogue and makes
no paid inference call. No provider secret is needed.

The refresh job has repository read permission. It checks the existing data,
fetches the catalogue, writes a candidate snapshot and runs content, model,
Horizon, JavaScript and production-build checks. Only the three data files enter
the candidate commit. The job uploads that commit as a bundle and the already
checked Pages output as an artifact.

The separate publication job verifies the exact candidate and parent, allowed
paths and regular file modes. It retains a candidate branch and pushes main
only as a normal fast-forward. Repository branch rules and concurrent changes
can reject the push. Nothing force-pushes, rebases or bypasses a required gate.
If rejected, retain the candidate for inspection and run a new snapshot against
the current main commit. Do not publish the stale artifact.

GitHub token pushes do not start the ordinary Pages workflow, so this workflow
deploys its checked artifact itself. The publisher runs no provider requests,
package scripts or generated source. Both publishers share the Pages
concurrency group.

## Data rules

- Only exact IDs already in the tracked roster can change.
- At least 80 per cent of tracked IDs must match, or the entire check fails.
- Empty, malformed or duplicate-ID catalogues fail before any write.
- A missing model has unknown prices. Invalid rate values are not zero.
- A price change above 50 per cent, a zero-to-paid change or a changed locked
  price is retained for review. It cannot be shown as freshly verified.
- Context, weight sources, names and other non-price fields are preserved.
- The snapshot records every quote, applied value and reason for review.
- Published run history links to the actual workflow. Its API cost is zero,
  excluding Actions compute and hosting. Existing logs retain the normal
  90-day window, with older records preserved in Git history.

The local command `node scripts/model-price-snapshot.mjs` fetches and reports a
check without writing. `--write` updates the three data files. Do not call it as
an automated test against the working repository. The test suite exercises the
planning function with fixtures. The first deployed workflow is the integration
check. Failures remain visible in Actions and do not fabricate a fresh record.

The original systemd model script remains available for legacy operation and
roster proposals. Access to that separate server has not been established.
