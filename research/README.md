# SOFT CAT research

We build open, reproducible investigations of agent cooperation. The first
[offline delegation harness](delegation/README.md) tests task-scoped revocation,
evidence roots and a deterministic final-state grader using synthetic data.

**Stage: offline development harness.** Recorded script executions exist. No
model agent, protocol adapter, cross-framework comparison, held-out evaluation
or independent reproduction is claimed.

## Run the first artefact

Node 24 is required. The harness has no npm dependencies or provider calls.

```sh
node --test research/delegation/*.test.mjs
node research/delegation/run.mjs
node research/delegation/run.mjs --verify research/delegation/results/latest.json
```

The default runner prints a fresh JSON receipt. Verification regenerates the
deterministic cases and compares them with the recorded receipt. It does not
repeat a model experiment. See the [registered design](../docs/research-programme.md),
[constitution](../CONSTITUTION.md) and [contribution guidance](CONTRIBUTING.md).

## Licence and boundaries

Original contributions under this directory use [Apache License 2.0](LICENSE),
subject to explicit third-party notices. The fixture and implementation are
original, AI-assisted work reviewed within the SOFT CAT project. No third-party
code or data is bundled. Node's built-in modules are the only runtime dependencies.

This scope does not relicense historical website material or Feral artworks.
The [licensing scope](../LICENSING.md) is explicit. We claim no upstream
endorsement, standard, accepted contribution or independent reproduction.
