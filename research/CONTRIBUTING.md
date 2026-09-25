# Contributing to SOFT CAT research

Start with the [constitution](../CONSTITUTION.md) and
[experiment design](../docs/research-programme.md). The [offline harness](delegation/README.md) now implements the development
fixture, script baseline and deterministic grader. Useful contributions include
a failing regression, a grader blind spot, or a reviewed adapter proposal.
Agent execution and evaluated comparisons remain future gates.

Open a focused pull request with:

- The question or defect it addresses and relevant existing work.
- Source provenance, dependency terms and any AI assistance.
- Exact commands actually run, their results and remaining verification limits.
- Both expected valid outcomes and deliberately incorrect outcomes the grader rejects.
- Changes to assumptions, fixture data or the evaluation protocol, made explicit.

Only contribute material you are entitled to submit under Apache-2.0. Preserve
third-party notices. The [licensing scope](../LICENSING.md) does not cover all
historical website material. Do not copy unreviewed material into this component.

Keep development and evaluated fixtures separate. Do not overwrite failed
trials, silently alter a frozen protocol or report a replay as fresh execution.
An independent reviewer must inspect the grader and permitted claims before
results are published. Record unresolved disagreement.

Do not include credentials, customer data or targets outside the declared
research boundary. Paid execution needs configured access and a recorded spend
limit. An ordinary code contribution must not start paid or external workloads.

Site publication uses the repository checks in `../IMPROVEMENT_LOOP.md`.
The offline runner needs Node 24 and built-in modules only. Its README documents
the reproduction and verification commands. Preserve the recorded receipt and
regenerate it deliberately when changing the fixture, runner, grader or tests.
