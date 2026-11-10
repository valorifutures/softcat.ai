# Framework recovery, deterministic development experiment

**Stage: real framework execution with deterministic local responses.** LangGraph
1.2.12 routes operations through coordinator and investigator nodes. A separate
Python process uses PydanticAI 2.50.0 with `FunctionModel` and real tool dispatch.
The model responses are fixed Python functions. No remote model, reasoning
benchmark, held-out comparison or independent external reproduction is claimed.

The question is what a caller can honestly report when a worker stops after
committing an action but before returning its acknowledgement. A missing reply
leaves the outcome unknown. A separately authorised read of the durable receipt
can resolve it without repeating the effect.

This is preparation for gate 3 of the [research programme](../../docs/research-programme.md).
The original [gate 2 receipt](../delegation/README.md) remains unchanged.

## Reproduce the framework run

Tested with Python 3.12 on Linux x86-64. Exact Python, SQLite and framework
versions are in the receipt. Dependency installation needs registry access.
After installation, the experiment uses local files and subprocesses only.

```sh
python3.12 -m venv .venv-recovery
.venv-recovery/bin/python -m pip install --require-hashes --only-binary=:all: -r research/recovery/requirements.lock
.venv-recovery/bin/python -m unittest discover -s research/recovery -p 'test_*.py'
.venv-recovery/bin/python research/recovery/run.py --verify research/recovery/results/latest.json
.venv-recovery/bin/python research/recovery/run.py --out /tmp/new-recovery-receipt.json
```

The lock pins all 44 runtime packages, including transitive dependencies, with
wheel SHA-256 values retrieved from their exact PyPI releases. `dependencies.json`
records versions, registry links and upstream licence metadata. The original
installation was repeated with hash enforcement before the recorded run.
No wheels or third-party source are bundled in this repository.

The default command emits JSON to stdout. `--out` refuses an existing path.
All nine scheduled cases remain in the receipt, including any errors. A failed
valid case, missed seeded outcome, infrastructure error or control failing for
the wrong reason makes the command return non-zero. A setup failure stops before
execution and reports the actual exception.

`--verify` executes both frameworks and the subprocesses afresh, then compares
source hashes, events, queues, reports, grader outcomes and deterministic
execution facts. It excludes the original date, environment and elapsed time.
It replaces OS process numbers with stable aliases while preserving their
identity relationships. This is an internal rerun, not an external reproduction
or fresh model evaluation. Each run checks installed versions against the lock's
metadata. The PR and Pages build depend on a separate read-only CI job that
installs the hashed packages and runs these checks without checkout credentials.

## Cases fixed before the recorded development run

| Case | Required observation |
| --- | --- |
| Clean | Both jobs commit through the real framework paths |
| Delayed revocation notice | The authoritative queue blocks A before its specialist receives the local notice, while B completes |
| Lost reply after commit | The worker really exits with code 74, the caller reports unknown, and a fresh process reconciles the original receipt |
| Restart before commit, then revoke | The worker really exits with code 73, A stays stopped after revocation, a receipt lookup finds no effect, and B completes |
| Identical retry | A fresh process retries the same key and payload, returning the original receipt with one effect |
| Conflicting retry | Reusing the same key with a different payload is rejected |

The deliberately deficient controls skip the commit-time revocation check,
disable durable duplicate protection, or assert success after a lost reply.
Their required rejection codes are registered in `run.py`. A generic malformed
trace does not count as successfully detecting the intended fault.

The SQLite transaction is the authoritative ordering point. Requests, effects,
revocations and receipts persist across connection and worker lifetimes.
Idempotency binds the job, key and canonical payload. A historical receipt read
uses separate permission and does not create fresh write authority. The tests
also exercise two-connection commit/revocation and duplicate-key races.

Each case is bounded to twelve worker calls, ten seconds per worker and the
fixture's event ceiling. This is one execution per deterministic case, with no
statistical performance claim or calibrated inference budget. FunctionModel
requests are counted separately from remote provider calls. Provider inference
is zero. Total execution charge is unknown, recorded as null.

## Trust boundary and what remains open

The host, Python runtime, SQLite database, issuer registry and harness-supplied
caller identity are trusted. Grant IDs are local handles, not authentication.
The worker has database access. This is not containment of a hostile worker,
a compromised host or a model forging another caller's identity. Before any
untrusted model execution, actor identity must be bound outside model-controlled
tool arguments and the action service must have a separately reviewed boundary.

The transport is local JSON over subprocess input/output. No A2A or MCP adapter,
distributed consensus, network delay measurement or protocol conformance is
claimed. A delayed notification is an explicit event schedule. SQLite order
is logical sequence, not distributed time. A stopped worker does not undo a
committed action. Deterministic response functions test integration and reporting,
not intelligence or susceptibility to arbitrary prompt injection.

Provider requests are disabled using PydanticAI's documented guard. Python
network connection/DNS guards catch accidental requests during execution.
Child processes inherit an allowlist of ordinary environment values, without
provider, GitHub or publishing credentials. These are application controls,
not an operating-system sandbox for malicious code. Tracing is disabled.

The separate [review record](review.md) keeps actual findings and corrections.
The next step is authenticated adapter boundaries and disjoint evaluation design
before paid model comparison. Existing task ownership, Horizon predictions,
Feral cycles and the daily price snapshot are unchanged.

## Provenance and related work

This original synthetic fixture, integration code and grader are AI-assisted
SOFT CAT work under the research [Apache-2.0 licence](../LICENSE). Dependencies
retain their own upstream terms. No affiliation, protocol endorsement, new
security standard or upstream acceptance is implied.

Official documentation consulted on 25 September 2026:

- [LangGraph graph API](https://docs.langchain.com/oss/python/langgraph/quickstart)
- [LangGraph interrupts and idempotent side effects](https://docs.langchain.com/oss/python/langgraph/interrupts)
- [PydanticAI testing and provider-request guard](https://pydantic.dev/docs/ai/guides/testing/)
- [PydanticAI FunctionModel](https://pydantic.dev/docs/ai/api/models/function/)

The implementation is a small integration and fault-testing contribution. It
makes no novelty claim for idempotency, durable execution or either framework.
