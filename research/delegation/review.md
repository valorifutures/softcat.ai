# Gate 2 review record

25 September 2026. This is review within SOFT CAT using separate collaboration
agents. It is not an external reproduction or evidence of model diversity.

## Roles and scope

One agent built the fixture, simulator and fixed-rule baseline. A second wrote
the grader and bad-outcome mutations without importing simulator policy. A
third reviewed the design and implementation read-only. The coordinating agent
integrated execution receipts, reproduction checks and the public page. A
fourth agent implemented that presentation.

## Actual disagreement and corrections

The first integrated execution accepted all four baseline conditions and
rejected all three deficient controls and twenty seeded wrong outcomes. That
was not sufficient to approve the grader. Independent review then found these
false passes in additional constructed traces:

1. Relabelling the real post-revocation probe as ordinary script activity still
   passed, because the unrelated invalid-grant probe was counted as revocation
   evidence. Coverage now requires an otherwise authorised probe denied because
   of revocation.
2. Removing the fabricated-authority probe entirely and consistently renumbering
   the trace still passed. The unreliable conditions now require that probe.
3. An action could cite unreliable evidence while its final report substituted
   clean roots. The grader now checks the committed action's evidence separately
   from the report.

Further review found that a request denied because its grant expired could be
mistaken for a request stopped by revocation. The in-flight coverage assertion
now distinguishes those causes. The fixed fixture also requires the delegated
Job A chain, so a root-authority shortcut cannot masquerade as that test.

A builder cross-review of the receipt verifier found that it ignored all
execution fields while promising to ignore only elapsed time. A tampered model
call count could pass. Verification now compares deterministic execution facts,
including model calls and unknown cost, and retains an explicit tamper test.

The corresponding bad outcomes are retained as named regression cases. Review
also corrected prospective expiry semantics, atomic commit adjacency, malformed
registry handling, unknown control metadata and an overly broad description of
the enforcement-disabled control. This control removes all action-boundary
permission checks, not only the revocation check.

## Limits retained

The fixture reveals the known fault and supplies diagnosis/remediation labels.
The script's vote tests plumbing, not diagnostic reasoning. Root provenance is
supplied by the fixture, not discovered or cryptographically authenticated.
The trusted issuer is a toy in-memory registry. Sequence is a single-process
logical order. No distributed propagation, real agent execution, unknown attack,
production guarantee or independent reproduction is claimed.

The critic's initial simulator probes passed for immutable input snapshots,
exclusive expiry, in-flight revocation, continued Job B, cross-job and fabricated
authority rejection, and delegation after revocation. A sweep of 1,704 malformed
single-field replacements caused no grader exception. That sweep checked
no-throw behaviour, not correct rejection of every possible mutation.

The final verdict and exact publication evidence are recorded in the repository
[improvement log](../../docs/improvement-log.md) and PR. This file records the
review content, not a successful deployment claim.
