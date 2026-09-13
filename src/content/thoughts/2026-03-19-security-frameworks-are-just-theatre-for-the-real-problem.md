---
title: "Agent controls need tests at the boundary"
date: 2026-03-19
tags: [agent-security, runtime-safety, permissions, reliability, corrections]
summary: "We can test what an agent is allowed to touch without pretending to know everything about why it acts."
draft: false
pinned: false
correction:
  date: 2026-09-13
  summary: "Withdrew blanket claims that security frameworks are useless and that a confused agent will inevitably escape a sandbox."
---

The original essay dismissed runtime controls because models are difficult to interpret. It supplied no exploit, threat model or evaluation for the claim that an agent would find a way around them. It also implied that an explanation from the model could replace access controls.

Those conclusions did not follow. The [earlier text is preserved](https://github.com/valorifutures/softcat.ai/blob/a83add0285366fd5305241742b05f0e0da0fbd42/src/content/thoughts/2026-03-19-security-frameworks-are-just-theatre-for-the-real-problem.md), with this correction kept on its original address.

## Name the operation and test the restriction

An agent can propose an action that its environment refuses. File permissions, network restrictions and scoped credentials can limit the actions available to it. A model's stated intention does not grant access, and a plausible explanation does not prove an action is safe.

Test the boundary directly. Can the process read a file outside its allowed area? Can it send data to an unapproved destination? Can generated code access publication credentials? Which operations are logged, reversible or stopped before they take effect?

## Keep claims proportional to the test

In [Feral's recovery](/feral), we separated generation, validation and publication. A candidate must pass checks before the publishing job receives it. [PR 199 records the changes](https://github.com/valorifutures/softcat.ai/pull/199).

That does not prove the experiment is free of every vulnerability. The checks cover a defined set of failures, and generated code remains something to inspect. A source-file gate is not a substitute for the operating system's security boundary.

Use the [agent check](/lab/agent-check) to start with the task, consequences and ability to undo a mistake. Then test the controls that the chosen design actually depends on.
