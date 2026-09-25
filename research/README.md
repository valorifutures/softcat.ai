# SOFT CAT research

**Status: specified, not implemented or run.** There is no agent runner,
benchmark result or demonstrated security guarantee in this directory yet.

We are building reproducible experiments in verifiable cooperation between
agents. Our first question is whether one job can lose authority throughout its
delegation chain while an independently authorised job keeps using the same
specialist, even when some evidence is unreliable.

Read the [registered experiment design](../docs/research-programme.md) and the
[site constitution](../CONSTITUTION.md). The design defines comparisons,
deterministic outcome checks, required measurements and evidence gates.

## First contribution

See [contribution guidance](CONTRIBUTING.md) for review, provenance and evidence requirements.

Implement an offline synthetic incident fixture, simulated action queue,
deterministic script baseline and final-state grader. A useful contribution
includes a case that should pass and deliberately incorrect outcomes that the
grader must reject. No provider key or paid model call is needed for this stage.

Keep evaluation fixtures separate from development fixtures. Future agent runs
must report all scheduled trials, limitations and failures. Recorded replay is
not live execution, and a proposed mechanism is not a measured result.

## Licence and boundaries

Original contributions under this directory use [Apache License 2.0](LICENSE),
subject to any explicit third-party notices. This scope does not relicense the
existing website, Feral artworks, historical writing or external source material.
The constitution and experiment design are also covered as listed in
[the licensing scope](../LICENSING.md). The programme is not a published standard or an affiliation with an upstream
project. No integrations, external contributions or independent reproductions
are claimed before they happen.
