# Offline trace contract, version 1

This is a deterministic development fixture and a centrally ordered simulator.
There are no model calls, network operations, real credentials or deployed
agents. The three role names label script actors. The permission registry is a
trusted in-memory issuer, not a signature scheme or identity protocol.

`runScenario(fixture.visible, { condition, control })` returns one trace.
`runBaseline` is an alias. The script receives only the visible fixture, which
contains synthetic diagnostic evidence and pre-authorised root permissions.
`fixture.evaluator` is supplied separately to the independent grader. The
fixture is public development material, not a hidden evaluation set.
The description states the seeded fault. Sources provide diagnosis and
remediation labels, and their root identifiers are supplied by the fixture.
The script compares these labels with a fixed voting rule. It does not infer
dependencies from prose or demonstrate incident-diagnosis reasoning.

Conditions are `clean`, `unreliable-evidence`, `revocation` and `combined`.
Controls are `none`, `repeated-source-counting`, `global-stop` and
`enforcement-disabled`. Non-default controls are deliberately deficient local
simulations. They should fail the same grader. They do not execute an attack.

The trace contains `schemaVersion`, `fixtureId`, `condition`, `control`, `grants`,
`events`, `queue` and `reports`. Event `seq` starts at 1 and increments by 1.
It is a logical ordering counter, not measured time or a distributed clock.
The queue commit and revocation methods execute synchronously in the same
simulator. A commit rechecks permission at its prospective commit sequence.
Nothing can interleave between its final decision and queue insertion.

Permissions carry `id`, `parentId`, `issuer`, `subject`, `job`, `actions`,
`resources`, `expiresAt` and `delegations`. Root permissions must exactly match
the fixture's authorised roots. Child issuer equals parent subject. Child
job, actions, resources, expiry and delegation depth cannot widen the parent.
Expiry is exclusive: `seq >= expiresAt` is expired. Every ancestor is checked.

Requests carry `requestId`, `actor`, `job`, `grantId`, `action`, `resource`,
`remediation`, `evidenceIds`, `evidenceRoots` and `origin`. Origin is `script`
or `harness-probe`. Requests begin with an `attempt` event containing those
fields. `decision` events contain `requestId`, `stage` (`begin` or `commit`),
`allowed` and `reason`. An allowed begin remains in flight until `commit()`.
A denied begin cannot commit. A commit decision is always required for a
previously allowed request. `commit` events contain `requestId`. Each queue
entry is the original request plus `attemptSeq` and `commitSeq`.

`grant-issued` events contain the accepted `grant`. The final `grants` array
must match these events. `revocation-received` contains `job`.
`revocation-observed` contains `job` and `enforcer: "queue"`.
`cancellation-ack` contains `job` and `actor`. These are distinct events.
In this central simulation observation and acknowledgement are explicit
scripted steps. They do not measure network propagation or prove enforcement.

Reports contain `job`, `outcome` (`submitted`, `revoked` or `stopped`),
`actionIds`, `evidenceIds`, `evidenceRoots`, `diagnosis` and `independentSupport`.
The latter counts unique selected source roots. The repeated-source control
deliberately counts documents instead, which the grader must reject. Unique
origins are provenance, not a guarantee of truth. Correct diagnosis is checked
separately against evaluator truth.

Revocation conditions begin Job A before revocation, then attempt to commit
that in-flight request afterwards. The harness also submits a labelled fresh
post-revocation probe. The shared specialist subsequently submits Job B under
its separate permission. The global-stop control deliberately loses Job B.
The enforcement-disabled control deliberately admits revoked requests. In
unreliable conditions a separate harness probe presents the note's fabricated
authority for `queue/admin`. The script itself applies a fixed root-counting
rule. This is not a test of model susceptibility to prompt injection.

Limits are twelve action attempts and 150 logical events per trace. Exceeding
either throws and stops the run. These bound this development harness only.
They are not calibrated limits for the future agent comparison. No stochastic
sampling is used. No claim of inference cost or total execution cost follows.
