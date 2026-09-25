# Delegated authority, offline harness

**Stage: implemented and executed on a public development fixture.** This
artefact exercises a simulator, fixed-rule script and independently authored
final-state grader. The role names are script actors. No AI agent, protocol
adapter, held-out comparison or independent reproduction has run.

The question is deliberately small: can Job A lose permission while Job B
continues through the same specialist? Can the grader reject a fabricated
success and documents that repeat the same evidence origin?

## Run without provider access

Use Node 24. The recorded receipt names the exact version and SHA-256 hashes
of every top-level source, test, fixture and documentation file in this directory.
There are no npm dependencies. From the repository root:

```sh
node --test research/delegation/*.test.mjs
node research/delegation/run.mjs
node research/delegation/run.mjs --verify research/delegation/results/latest.json
```

The runner prints a fresh JSON receipt. To retain a new execution, use
`--out /path/to/new-receipt.json`. The path must not already exist, so an
unsuccessful run cannot silently overwrite prior evidence. A failed valid
case, undetected seeded outcome or unexpectedly passing control makes the
command exit non-zero. Execution exceptions also stop with a non-zero exit.

`--verify` checks current source hashes and regenerates the deterministic
traces, violations and counts. It excludes the original timestamp, environment
and elapsed duration from equality. This is deterministic replay verification,
not an independent reproduction or a remeasurement of the original duration.
The existing PR and Pages checks run the harness tests and verify this receipt.

## What is recorded

Four one-shot conditions: clean, unreliable evidence, revocation and both.
Three intentionally deficient controls: count repeated documents as independent,
stop the shared specialist globally, and disable action-boundary enforcement. The
same grader judges every trace. A control should fail and expose the specific
harm, not be counted as a successful system.

`results/latest.json` retains all seven scheduled traces, final queues, reports
and grader violations. It also records every seeded negative case and its
expected/detected violation code. `negative-cases.mjs` reconstructs each full
corrupted trace from the recorded combined baseline. There is no stochastic
sampling, tuning on an evaluation set, statistical confidence interval or
claim beyond these finite development cases.

The simulator and grader were authored by separate collaboration agents.
The grader imports no simulator or policy implementation. A third agent
reviewed the assumptions, code, negative cases and permissible claims. This
separation is review within one project, not evidence of independent models,
independent source truth or an external reproduction. The actual review and
corrections are retained in [review.md](review.md).

## Boundaries that matter

- Permissions are trusted in-memory registry entries, not cryptographic identities.
- Revocation and commit share one synchronous ordering point. Sequence numbers
  are logical events, not milliseconds or distributed enforcement latency.
- A pending Job A request is checked again when committing. An explicit fresh
  post-revocation harness probe is separately labelled from script activity.
- The fixture's evidence has pre-labelled diagnosis and remediation fields.
  The script applies a fixed voting rule, not diagnostic reasoning. It receives
  only `fixture.visible`, but this public development fixture is not secret.
- Root deduplication checks provenance handling. It does not make a source true.
- The threat model trusts the host, fixture issuer, simulator, order and grader.
  No sandbox escape, unknown vulnerability or compromised trusted base is tested.
- The only mutation is a local in-memory remediation queue. No network request,
  real service operation or provider call is part of the harness.
- A run is limited to twelve attempts and 150 logical events per trace. These
  are engineering bounds, not calibrated budgets for the future agent experiment.
- Inference calls and tokens are zero because no model is invoked. Total
  execution charge is unknown, recorded as null. Elapsed time is measured for
  this process, not a performance comparison.

See [CONTRACT.md](CONTRACT.md) for event semantics and the
[registered programme](../../docs/research-programme.md) for future gates.
Before agent execution, select and pin two independent frameworks, review the
adapters and tool enforcement, configure access and spending explicitly, and
calibrate then freeze a separate evaluation protocol. The next contribution
should be a failing case or a reviewed adapter, not a larger success counter.

Original synthetic fixture and code are AI-assisted SOFT CAT work under the
research [Apache-2.0 licence](../LICENSE). No third-party implementation or
fixture data is bundled.
