# Authenticated action boundary

This development experiment places the unchanged recovery store behind a
separate Python service and real loopback mutual TLS. The service derives a
principal from its verified certificate registry, then checks synthetic task
grants. Caller identity cannot be supplied in the action arguments. It makes
no framework or model calls and does not use an AGNTCY SDK or claim conformance.

Read [the pre-run contract](CONTRACT.md) for the fixed 14 cases, five seeded
mutated-record controls, falsification criteria, limits and threat model.
The source and receipt distinguish transport identity, task authority and
durable state. An authenticated caller is not thereby authorised for every task.

## Reproduce

Use Linux, Python 3.12 and an OpenSSL executable supporting RSA/X.509 and TLS 1.3.
There are no third-party Python packages. Run from the repository root:

```sh
python -m unittest discover -s research/boundary -p 'test_*.py'
python research/boundary/run.py --out /tmp/new-boundary-receipt.json
python research/boundary/run.py --verify research/boundary/results/latest.json
```

`--out` refuses to overwrite a receipt. Fresh temporary certificate keys and
databases are removed at the end of each run. Results contain every case's
client calls, returned errors, service process identities and exits, logical
events, grants, durable requests and queue, independent grade and seeded-control
diagnostics. `--verify` re-executes the TLS and process paths and compares source
hashes and deterministic facts. It preserves the original timestamp and does
not pretend fresh certificates, process IDs or wall duration are reproducible.

The machine receipt lives at `results/latest.json` only after an actual run.
Its manifest is the authoritative list of source hashes, including the reused
`research/recovery/store.py`. `review.md` is excluded from those hashes so a
review can identify the receipt without a circular hash. Review status must be
read from that separate record; a builder cannot award independent agreement.

## What the adapter checks

The server pins TLS 1.3 and requires a temporary issuer's client certificate.
It maps the verified DER fingerprint to a server-configured principal, rather
than trusting the certificate's display name or request JSON. Strict framed
JSON rejects unknown keys, duplicate keys, non-finite numbers and oversized or
deep input. A distinct harness admin identity can revoke and inspect state,
but cannot submit actions. Only this service writes the database through the
API in the scripted experiment. The ordinary client never opens the store.

Grant handles refer to an opaque synthetic local registry. The unchanged store
checks delegated scope and expiry at begin and commit, applies atomic revocation
ordering and protects idempotent effects. The adapter additionally checks that
the committing TLS principal owns the pending request. Read grants are separate.
Expiry is a **logical event sequence**, not elapsed time. In-flight means a
durable pending request before revocation, not concurrent network transmission.

For the lost-reply case, a harness-configured service exits with code 74 after
the commit transaction returns and before sending a response. The client marks
the outcome unknown, launches another service process, and obtains an authorised
receipt lookup. The original committed effect remains exactly once.

The independent grader imports no service, store or runner enforcement code.
It compares recorded calls, durable state and event history with fixed expected
cases. Five deliberately corrupted recordings must fail for named reasons.
These controls are seeded test data, not discovered product vulnerabilities.

## Limits

All processes run as the same OS user. This is **not a malicious-process
sandbox**. A hostile process could read temporary keys or change the database;
the tested boundary covers the registered API requests only. Issuer, mapping,
service, store, OS and grader instrumentation are trusted. Environment
allowlisting removes inherited provider/publishing credentials from service
children; it is not an OS-enforced egress firewall. There is no external service
or provider call. Total computing charge is unknown.

This architecture-aligned adapter separates identity, authorisation and evidence
in the direction of AGNTCY / Cisco Outshift. It implements no Agent Identity,
discovery, A2A, MCP or interoperability protocol. The preceding framework
recovery study remains unchanged. There is no model quality comparison,
distributed-revocation result, production-security claim or independent external
reproduction. Apache-2.0 applies under the repository's research licensing scope.
