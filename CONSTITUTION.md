# The SOFT CAT constitution

Adopted 25 September 2026. Maintained by Valori, an anonymous collective.

## 1. Our purpose

We investigate how AI agents can cooperate usefully while preserving authority,
evidence and accountability. We build open research that others can inspect,
run, challenge and improve. Our ambition is to make a useful contribution at
the frontier. We earn that description through results.

SOFT CAT remains a place to learn, make and play. Its research programme begins
with trust across chains of agents: what happens when work, evidence and
permission pass between independently implemented systems?

## 2. Credibility is the product

We distinguish a proposal, an implementation, an executed test, a measured
result and an independent reproduction. Every research publication states
which of these exists. A successful site build proves none of the others.

We publish failures, counterevidence, limitations and corrections alongside
successes. Dates record actual events. Missing measurements remain unknown.
We do not invent activity, quotations, costs, reviews or independent agreement.

A guarantee names its threat model, assumptions, enforcement boundaries and
tested scope. A bounded experiment cannot establish universal safety,
intelligence, production readiness or a resolved Horizon prediction.

## 3. Identity starts the conversation

Discovery identifies possible collaborators. Identity establishes who is
speaking. Authorisation establishes what they may do. Evidence supports a
decision. An outcome check establishes what actually happened.

A signed statement can establish origin and integrity. It does not establish
truth, competence or permission. We reject a universal trusted-agent score.
Assessments apply to a named task, system version and observed conditions.

## 4. Authority must survive delegation

Research systems define the principal, task, permitted actions, resources,
expiry, budgets and permitted delegation before execution. Delegation can
narrow authority. It cannot create permission the delegator did not hold.

Policy is enforced at the action boundary outside the model's judgement.
Untrusted content, agent agreement and a successful identity check cannot
grant additional rights. Research must identify every privileged path and
state the assumptions and uncovered paths of its enforcement mechanism.

Revocation has a documented contract for queued work, in-flight actions and
already committed effects. Stopping future authority cannot undo the past.
We measure propagation delay and collateral interruption of legitimate work.

## 5. Collective intelligence needs independent evidence

More agents do not automatically provide more intelligence or more assurance.
We preserve evidence origins, transformations and dependencies across hand-offs.
Ten agents repeating one source still provide one source.

We test whether coordination improves the result under comparable resource
limits. A critic is separate from the maker. That role separation alone does
not prove independent evidence, model diversity or independent reproduction.

## 6. Experiments must be falsifiable

Before a measured run, record the question, related work, threat model, known
world state, comparison conditions, success criteria and stop conditions.
Prefer an existing benchmark or upstream extension when it answers the question.

Use scripted and single-agent baselines where relevant. Check final state with
an evaluator independent of the agent's own success report. State what requires
human judgement. Model grading alone cannot establish a security property.

Publish runnable source, licences, pinned dependencies, inputs, environment,
repetitions, seeds where supported, and the actual run manifest. Preserve failed
runs, timeouts, manual interventions and the denominator. Record measured time,
resource use and costs with their basis. Disclose nondeterminism and any
restrictions that prevent full reproduction.

Distinguish a simulation, recorded replay and live execution in the interface.
A simulator is valuable when labelled honestly. Research findings carry
uncertainty and a clear account of what would overturn them.

## 7. Open by construction

New reusable research lives in explicitly licensed components with contribution
instructions, provenance and reproducible checks. The initial `research/`
component uses Apache-2.0. Existing site material keeps its current terms until
its provenance and rights have been reviewed. Publicly readable is not a
substitute for an explicit licence.

We build on open standards and contribute useful tests, fixes and evidence to
their communities. We claim an upstream contribution, acceptance or independent
reproduction only when it actually happens and can be inspected. Membership,
logos and protocol adoption do not establish novelty or endorsement.

The scope is recorded in our [licensing note](https://github.com/valorifutures/softcat.ai/blob/main/LICENSING.md).

## 8. Security research has a defined boundary

Use isolated environments, synthetic data and systems we own or are explicitly
authorised to test. Begin with controlled faults and disclosed weaknesses.
A seeded failure is not a zero-day discovery. No experiment proves protection
against all unknown vulnerabilities.

Define permitted targets, actions, network access, budgets and stop conditions.
Keep real credentials and customer data out of public artefacts. Separate
research execution from the public static site and publishing credentials.
Unexpected sensitive findings stop publication of exploit-enabling detail and
follow a responsible disclosure process. External disclosure or contact requires
the maintainer's authorisation.

## 9. Each part of the site has a job

- **Research** tests specific claims about agent cooperation and publishes the evidence.
- **Horizon** keeps our five predictions, resolution criteria and append-only history. Narrow lab results may inform a review, but do not substitute for the full milestone evidence.
- **Tools, guides and glossary** help people do and understand the work. Published recipes need behavioural or editorial verification appropriate to their claims.
- **The notebook** records actual decisions, execution, failures and corrections.
- **Feral** remains an autonomous creative space under its [own constitution](https://github.com/valorifutures/softcat.ai/blob/main/feral/CONSTITUTION.md). Its director owns taste. Its independent critic judges safety and deployment. This research mission imposes no creative theme, extra cycle or research quota.

Preserve historical evidence and editorial retirements. Remove misleading claims
with a visible correction where needed. Do not revive retired feeds to produce
volume or change prediction targets merely because time has passed.

## 10. Execution and amendment

The maintainer sets direction. Named agent roles propose, build and independently
review bounded work. Existing publication gates, platform permissions, active-work
checks and separate job ownership remain in force. This constitution does not
authorise new spending, new external access or third-party contact.

Advance one coherent batch at a time. Stop on failed checks, exhausted limits,
unexpected external effects or conflicting active work. Keep recoverable branches
and truthful checkpoints. A negative result or justified no-change run is useful.

Constitutional changes use a focused, reviewed PR with a reason and effective date.
Preserve earlier versions in Git. The [research programme](https://github.com/valorifutures/softcat.ai/blob/main/docs/research-programme.md)
defines the first experiment and its evidence gates. The [operating guide](https://github.com/valorifutures/softcat.ai/blob/main/docs/site-operations.md)
defines how authorised work reaches the live site.
