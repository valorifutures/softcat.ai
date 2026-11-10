# Authenticated boundary review

**Verdict: PASS for the registered local development experiment.** Reviewed
1 October 2026 by a critic separate from the builder, with a separate transport
audit. This is role-separated local review and fresh execution in the same
working environment, not independent external reproduction.

The recorded receipt was generated at `2026-10-01T20:38:36.107776+00:00`.
Its SHA-256 is
`6fb162f7fe830ebbc9539e1901213502b0da9c38e37f0a5dd73acd41c954ae54`.
The critic independently checked all nine manifest hashes against the files,
regraded every case and reran the actual TLS and service-process experiment.
`review.md` is excluded from the source manifest to avoid a circular receipt.

## Evidence checked

- All 25 persisted tests passed, comprising 21 grader tests and four real
  transport tests. The latter exercise admin/action separation, unmapped trusted
  certificates, invalid certificates followed by a successful valid client,
  and malformed or ambiguous JSON.
- `python3 research/boundary/run.py --verify research/boundary/results/latest.json`
  passed in Python 3.12.14. This freshly executed all 14 registered cases and
  reproduced the five required mutated-record rejections.
- The receipt contains 15 service process starts, 33 registered probe calls and
  14 admin snapshot calls, making 47 client calls in total. Ten OpenSSL processes
  create certificates and one records its version. Total execution charge is
  unknown. No model or provider invocation is present in the inspected paths.
- Separate CLI challenges rejected a changed source hash, a changed stored
  grade and a fabricated authentication result using `CONNECTION_REFUSED`.
  `--out` refused an existing file without changing its bytes. The checked-in
  receipt remained unchanged throughout these checks.
- Separate real TLS probes rejected admin submission, specialist revocation and
  snapshot access, duplicate JSON keys, malformed JSON and two frames in one
  write. Complete before/after snapshots were equal, with no events, requests,
  queue effects or revocations. An authenticated client trickling bytes at
  zero, one and two seconds was disconnected after 3.002 seconds.
- Five repeated requests from a CA-trusted but unmapped certificate returned
  `UNMAPPED_CERTIFICATE`, leaving durable state empty. A mocked suite deadline
  preserved a completed trace and supplied `NOT_RUN` records for remaining
  cases. These supplemental probes are separate from the registered 14-case
  receipt and five seeded controls.

## Findings and corrections

The initial candidate was not accepted unchanged. These findings were reported
to the builders and the corrections were checked before this verdict.

| Finding | Correction and observed check |
| --- | --- |
| A per-operation socket timeout let trickled input exceed the declared connection and service deadlines. | The service now uses an absolute connection deadline, remaining-time socket limits and a service alarm. The real trickle probe closed at 3.002 seconds. |
| An unmapped certificate was denied before its request was consumed, so the client sometimes saw only a missing response. | The service consumes a bounded frame before the denial. Five repeated real TLS probes received the explicit denial. The earlier behaviour was fail-closed, but did not reliably expose its intended reason. |
| A suite-level deadline could discard earlier completed traces. | The suite retains completed records and adds explicit `NOT_RUN` failures for the remaining fixed denominator. The mocked deadline check confirmed both parts. |
| The wrong-owner case accepted an unrelated request identifier in a forged recording. | The grader now requires the commit probe to reference its preceding pending request. The original mutation fails with `PROBE_CONTRACT`. |
| The resource-scope case accepted a null resource substituted into both request and denial event, confusing a schema error with the registered scope probe. | The grader requires the fixed `other-resource` value. The original mutation fails with `PROBE_CONTRACT`. |
| A commit event with a contradictory `DENIED` status was accepted. | Event kind and status must agree. The original mutation fails with `EVENT_STATUS`. |
| A denied begin event with a wrong payload digest was accepted. | The grader recomputes the digest. The original mutation fails with `PAYLOAD_HASH`. |
| Admin snapshots were omitted from the helper's client-call limit and the initial execution count. | The helper counts every call. The receipt separately reports 33 probes, 14 snapshots and 47 total calls. |

All four grader mutations were independently repeated after correction against
a fresh real run. Each was rejected, while all 14 valid cases still passed.
They are supplemental critic challenges and persisted regression tests, not
additional pre-registered controls, discovered exploits or zero-day findings.

## Authority and evidence assessment

The server requires a CA-verified TLS client certificate and maps its DER
fingerprint to a configured principal. Request JSON cannot supply that identity.
The strict schema rejects unknown fields, duplicate keys, non-finite numbers,
wrong types and bounded-size or depth violations. A trusted certificate absent
from the principal registry grants no service authority.

The admin certificate can revoke and inspect state but cannot begin, commit or
read action receipts. Ordinary principals cannot invoke admin operations. The
adapter checks a committing principal against the persisted request owner
before calling the unchanged recovery store. The store rechecks the delegated
grant chain at commit. Scope, delegation attenuation, logical expiry and
revocation are enforced outside the client request's assertions.

The grader owns its expected case and grant registries. It matches calls to
ordered durable events and reconstructs requests, committed effects and
revocations before comparing final state. The revocation case exercises a
pending A request, denies its later commit and still commits B. Its separate
read grant permits an authorised `ABSENT` lookup after A write revocation.

The lost-reply case records a committed effect, service exit 74, client
uncertainty, a distinct restarted process and an authorised `FOUND` lookup.
Identical retries return the original receipt, while conflicting retries retain
the original effect. The missing and foreign certificate cases require actual
TLS rejection, rather than accepting arbitrary infrastructure errors.

## Source identity

| Manifest file | SHA-256 |
| --- | --- |
| `research/boundary/CONTRACT.md` | `27af6495b9968fa8a7e2a90b7856edc8ed9cd90f05d7df323a0e6f84554579ca` |
| `research/boundary/README.md` | `b0009c49629d2e5884f56c41d26a8673c24e897cc02cd1702c356a9de5363c15` |
| `research/boundary/grader.py` | `33d2588f1cc6b9aa4316615994832e0b608e604ed221148c918a8cb0b99a6058` |
| `research/boundary/run.py` | `94a8572fa16d7ff0daca4caa18c4bd56d05be2f3e0b3abb646e3d5d7ec3023a3` |
| `research/boundary/scenarios.py` | `7d081340249565dc2ecf3d04cdbb50b1ee461ea7fb8c2932d6e1e91a57cf9e20` |
| `research/boundary/service.py` | `8c9fa4a3a601ea778e6672889651dc1d8e2e0ae9174e80d6b0671adf8330e98e` |
| `research/boundary/test_grader.py` | `36bccf39ba89ee379048d0e9405d01cc9624651ea4b890d09db829d347f85cd8` |
| `research/boundary/test_service.py` | `d3a3437e6138b87f219a4bbd2452f74b4af0447879cf2558c85449d642435982` |
| `research/recovery/store.py` | `8e3829e9afd2b432186ef6ba96713f513f56c40c935c540d809aa65d9f35669f` |

## Limits and publication scope

Clients and service share an OS user. That user can read keys, edit the database
or bypass the API by importing the store. The result covers these scripted
service requests in a trusted environment. It does not demonstrate containment
of malicious processes, protection after host or issuer compromise, certificate
revocation, distributed policy replication or production security.

Expiry is logical event order. In-flight work means a durable pending request,
not simultaneous network execution. The five deficient controls mutate recorded
evidence after a real run. They are not executions of weakened services. No
AGNTCY SDK, badge, A2A/MCP protocol, interoperability or conformance was tested.
The work does not establish model capability, novelty, endorsement or completion
of the remote-model evaluation gate.

The public page and research documentation were checked for these distinctions.
The new reusable workflow runs on a separate read-only job with checkout
credentials disabled and no passed secrets. PR and Pages builds depend on it.
Publishing permissions remain in the separate deployment job. Source review of
that wiring is not evidence that hosted checks or deployment have run.

The final site candidate, hosted validation, deployment and rendered live page
are separate release checks. This review does not claim their completion.
