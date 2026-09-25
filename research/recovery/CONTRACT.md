# Offline recovery contract

This development extension exercises real LangGraph 1.2.12 routing and real
PydanticAI 2.50.0 tool dispatch with a `FunctionModel`. Its replies are fixed
Python functions. There is no provider inference, learned diagnosis, held-out
evaluation or completed programme gate 3. The earlier evidence-provenance
experiment remains separate. These queue payloads are synthetic proposals.

## Runtime and boundary

LangGraph's coordinator and investigator nodes route each operation to a fresh
subprocess implementing the same PydanticAI specialist. Both A and B use that
implementation. They do not share a continuously running specialist process.
The FunctionModel emits a tool call. PydanticAI validates and dispatches it,
then the FunctionModel reports the actual tool return. The host and all these
components are trusted. Model text never grants authority.

The action boundary is the local SQLite store. Its ordered transactions cover
grant checks, revocation, idempotency and queue effects. Job A write revocation
does not revoke its separately granted receipt read permission. It does not
undo an effect committed earlier. Receipt reads are read-only apart from audit
events. This is central serial ordering, not distributed consensus or a network
revocation guarantee. Expiry uses durable event order, not elapsed seconds.

The static fixture registers exactly two jobs and three write delegation levels.
The child names its parent and cannot widen action, resource, expiry or delegation
depth. Receipt read grants are separate roots. Registry identifiers are synthetic
local keys, not cryptographic identities or interoperable agent passports.

Every worker receives an environment allowlist without inherited provider,
publishing or tracing credentials. Python IPv4/IPv6 connections and DNS are
guarded, tracing is disabled and PydanticAI provider requests are forbidden.
This is an accident guard, not an adversarial sandbox. Workers retain ordinary
OS and filesystem access under the local runtime user. Do not feed hostile code
or real credentials to this runner.

## Registered cases

| Case | Perturbation | Required observation |
| --- | --- | --- |
| clean | None | One A effect and one B effect |
| delayed_revocation | A is pending when revoked, local notification follows commit attempt | A denied at commit, B completes |
| lost_ack_restart | Worker exits after durable A commit and before stdout acknowledgement | Parent records unknown, fresh worker reads receipt, exactly one A effect |
| restart_before_commit_revoke | Worker exits before commit, then A is revoked | New worker's commit is denied, receipt lookup is absent, B completes |
| identical_retry | A repeats its key and identical payload | Existing receipt returned, one A effect |
| conflicting_retry | A repeats its key with a different payload | Conflict returned, original effect unchanged |

Three deliberately deficient controls allow a revoked commit, disable durable
duplicate protection, or report success immediately after losing acknowledgement. Their
failures are preserved and must be rejected. They operate only on this local
synthetic queue. None is a discovered vulnerability in either framework.

Each recorded run executes all nine development conditions once. Development
smoke tests and internal reruns are separate from this finite receipt. Each case allows at most 12 subprocess calls.
Each subprocess allows two FunctionModel requests and one tool call, with a
10-second wall timeout. Graph execution allows four steps. The grader bounds
each trace to 300 events. These are engineering limits, not an evaluated model
budget or statistical sample design.

## Crash and reporting semantics

Exit code 74 is deliberately raised with `os._exit` inside the tool callback,
after its durable transaction returns and before the final FunctionModel
response or stdout output. Exit code 73 occurs before the store operation.
This kills an actual worker. The parent records the observed exit code and
missing response. It must not infer the action result from that missing response.

The parent records `outcome_unknown` for A, then starts a different worker. Only
an authorised `lookup` result permits a `reconciled` event and a final report.
Every worker has a per-case identifier and its observed PID. Actual PIDs remain in the raw receipt. Deterministic reruns map them to stable
aliases that preserve their equality and distinctness relationships. Every raw
report is retained, including the false-success control's premature report.

`run_suite(fixture=None, directory=None)` returns all nine traces. Each has
`id`, `scenario`, `control`, `events`, `queue`, `grants`, `revocations`, `requests`,
`reports`, `worker_runs`, `framework_calls` and `error`. Events use ordered
`seq` fields. `reports` contains every emitted report in order, with `job`,
`status` and `action_ids`. It is not an alias for final database state.

The independent grader compares event history and queue state with the fixed
fixture. It does not import action-boundary enforcement or trust a worker's
success report. Local instrumentation and the event log themselves are trusted.
Deleting or fabricating data inside this trusted base is outside containment
claims, although intentionally corrupted recordings test the grader's checks.

## What remains open

This runs two framework libraries through a private JSON subprocess contract.
It does not implement A2A, MCP, AGNTCY or a portable public protocol. It does not
measure agent intelligence, network delay, recovery under host loss or power
failure, concurrent distributed replicas, or adversarial escape. It does not
establish independent reproduction merely because a separate review agent runs
it. Real model comparisons require the programme's further gates and explicit
access and spending limits.
