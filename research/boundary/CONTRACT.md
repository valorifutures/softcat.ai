# Authenticated action boundary: registered development contract

Registered 1 October 2026 before executing this study. Apache-2.0; see
`research/LICENSE`. This contract fixes the cases and limits for one development
receipt. It is not a held-out comparison or a statistical security evaluation.

## Question and relationship to prior work

Does a small action service derive the caller from a verified transport identity,
reject caller identity supplied in tool arguments, and preserve delegated task
authority and durable recovery through the existing recovery store?

The design separates authenticated identity, task authorisation and outcome
evidence, consistent with the AGNTCY / Cisco Outshift architecture direction.
This is an architecture-aligned adapter experiment. It uses no AGNTCY SDK,
Agent Identity implementation, A2A, MCP or protocol conformance suite. It claims
no interoperability, membership, endorsement or upstream acceptance. The
recovery study remains unchanged and is not reclassified as interoperable.

## Trusted base and scope

Python 3.12 standard-library `ssl`, local OpenSSL, operating system, runner,
synthetic certificate issuer, certificate-to-principal registry, service,
unchanged `research/recovery/store.py`, SQLite and instrumentation are trusted.
All certificates and keys are freshly generated inside a temporary directory;
private keys and certificate bytes never enter the repository or receipt.
The service listens only on 127.0.0.1 and requires a client certificate trusted
by its temporary CA. It maps the verified certificate hash to a principal.
The request schema never accepts subject, caller, issuer or identity overrides.

The separate service process is the only database API writer in this harness.
The client and service nevertheless run as the same OS user. This is **not a
malicious-process sandbox**: code under that user could read keys, edit the
registry/database or bypass the service by importing the store. The result
only covers scripted requests through the service API. Certificate revocation,
rotation, external issuer discovery, compromised keys, hostile code, host loss,
multi-host execution and distributed policy replication are outside scope.

The store authorises delegated chains at begin and commit. Expiry is SQLite
event sequence, **not wall-clock certificate or grant expiry**. Revocation and
commit share its atomic ordering point. In-flight here means a durable pending
request whose begin occurred before revocation; it does not mean simultaneous
network transmission. A separately authenticated harness admin may revoke and
inspect snapshots; it has no queue-submission operation. Receipt reads require
separate read grants and remain possible after write revocation.

## Fixed cases, one repetition each

| Case | Required durable and observed result |
| --- | --- |
| authorised | Specialist commits exactly one A effect |
| missing_certificate | TLS request fails; no effect |
| untrusted_certificate | Foreign self-signed certificate fails; no effect |
| wrong_caller | Trusted wrong principal cannot use A-write; SUBJECT_MISMATCH |
| caller_spoof | Specialist caller override rejected by strict schema; no effect |
| scope_job | A-write with job B rejected; SCOPE_MISMATCH |
| scope_resource | A-write on other resource rejected; SCOPE_MISMATCH |
| expired_grant | A delegated chain reaches expiry after begin; commit EXPIRED |
| revoked_inflight | Begin A, admin revoke A, commit A REVOKED; B still commits |
| identical_retry | Same A key and payload returns REPLAY; exactly one effect |
| conflicting_retry | Same A key with changed payload returns CONFLICT; original retained |
| lost_reply_restart | Service exits 74 after durable commit before reply; client records unknown; new service reads FOUND; exactly one effect |
| receipt_read_denied | A commits; wrong principal and write-only grant cannot read receipt |
| commit_wrong_caller | A begins; wrong principal cannot commit specialist's request; no effect |

Five named mutated-record controls must fail the independent grader for their
registered reason: unexpected_effect / UNEXPECTED_EFFECT; missing_B /
MISSING_EFFECT; false_auth_success / AUTHENTICATION_BYPASS; duplicate_effect /
DUPLICATE_EFFECT; lost_reply_false_success / FALSE_CERTAINTY. These are seeded
deficient recordings, not discovered exploits or executed weakened services.
The grader must compare durable state and event history against fixed outcomes,
not trust a client success field or case-provided expected outcomes.

## Limits and stop conditions

Only synthetic local queue mutations and loopback connections are permitted.
No framework or model invocation, provider call, external service, spending,
customer data or real credential is used. Service subprocesses receive an
environment allowlist without inherited provider or publishing credentials.
This is an accident guard; it is not OS-enforced egress isolation.

Each case permits 16 client calls, 2 service processes and 32 accepted socket
connections per process. Requests and responses are limited to 16 KiB; strings
and keys to 128 characters and payload JSON to 4 KiB. Each connection times out
after 3 seconds; each service lives at most 20 seconds and has a 3-second shutdown
budget. The full suite has a 180-second deadline. Certificate creation permits
at most 16 OpenSSL subprocess calls, each bounded by 10 seconds. OpenSSL RSA key
generation and TLS use fresh randomness. Case ordering and payloads are fixed.

Unexpected exceptions, timeouts or missing cases fail the receipt. Preserve all
case errors and executed outcomes; never silently exclude them. Stop on an
unexpected external effect, leaked secret or violated global limit. An existing
receipt cannot be overwritten. `--verify` re-executes all cases and compares
source hashes and deterministic behavioural facts; timestamps, elapsed time,
OS-assigned PIDs, ephemeral certificate hashes and platform error wording are
not deterministic claims. Verification is a fresh local rerun, not independent
external reproduction.

## Falsification and permitted claims

One unauthorised durable effect, post-revocation A commit, duplicate effect,
incorrect read, unchallenged caller override, missing legitimate B completion,
false success after lost reply, unrecorded case failure or accepted bad control
falsifies the stated sample result. Passing means only that these public scripted
development cases behaved as required through this local adapter. It establishes
no model capability, production security, malicious-process containment,
distributed revocation guarantee or AGNTCY conformance. Total execution charge
remains unknown; zero provider requests is measured from the implementation's
bounded call paths, not a claim that computing was free.
