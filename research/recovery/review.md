# Framework recovery review record

25 September 2026. Separate collaboration agents designed the experiment,
built the SQLite boundary, integrated the frameworks, authored the grader and
built the public page. A read-only critic challenged their work. This is review
within one project, not external reproduction or model diversity evidence.

## Actual findings during development

The first PydanticAI integration used a synchronous tool callback. The framework
ran it in a worker thread, exposing SQLite's connection-thread affinity error.
The callback was changed to async, keeping the trusted connection on its event
loop thread. The subsequent smoke run genuinely executed all nine cases.

The critic and coordinating agent found a grading error in which control IDs
were treated as scenario names. Controls would have failed for an unknown
scenario rather than their intended fault. The grader now checks the registered
scenario and the runner requires the control's specific expected rejection code.

Review also identified gaps involving a wrong but internally consistent
remediation payload, unrelated worker starts masquerading as recovery, repeated
lost-response episodes sharing an old reconciliation, and reports without a
matching authoritative lookup. The grader author added causal checks and named
corrupted traces. Final test outcomes remain in the receipt and publication log.

A further independent mutation pass found that an impossible worker PID, a
mismatched dispatched tool operation, a false denial reason and an intermediate
fabricated revoked report could escape the initial grader. These findings were
sent back to the grader author for explicit corrections and regression cases.
The critic independently reran those mutations after correction. Each was
rejected for its specific fault, alongside all 32 named corruptions.

A trust-boundary review clarified that the fixture's caller identity and grant
handles are trusted harness inputs. The worker has database access. The public
page and README therefore make no hostile-worker containment or authenticated
identity claim. The duplicate-protection control deliberately ignores the stored
record, rather than claiming a real database mysteriously lost state.

The initial offline delegation fixture and receipt are preserved unchanged.
No provider calls, production network effects or outside contacts are involved.
The final critic verdict, exact candidate, test counts and deployment evidence
are recorded in the [improvement log](../../docs/improvement-log.md) and PR.
