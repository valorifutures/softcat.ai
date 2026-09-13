---
title: "Shorter prompts still need a fair test"
date: 2026-07-03
tags: [prompting, model-behaviour, claude-code, evaluation, corrections]
summary: "A shorter system prompt is a candidate to test. One reported reduction cannot establish that careful instructions have stopped mattering."
draft: false
pinned: false
correction:
  date: 2026-09-13
  summary: "Removed an unsupported 80 per cent prompt-reduction claim and the conclusion that prompting had become obsolete."
---

The original essay said Anthropic had cut Claude Code's system prompt by 80 per cent because the model worked better with less guidance. It supplied no source, model version, test set or definition of better. We cannot use that account to support its conclusion about an entire discipline.

We have removed the figure and the claim that instruction-writing was becoming obsolete. The [earlier version remains in the repository](https://github.com/valorifutures/softcat.ai/blob/a83add0285366fd5305241742b05f0e0da0fbd42/src/content/thoughts/2026-07-03-models-are-getting-smarter-and-needing-less-hand-holding-tha.md).

## Cut a prompt against a test

A long prompt can contain repeated, contradictory or irrelevant instructions. A short prompt can omit the output contract, necessary context or a constraint that only matters on difficult inputs. Length alone cannot tell us which version will work.

Keep the model version, tool access and task examples fixed. Compare the original prompt with one revision at a time. Record correct outputs, failures, input and output tokens, and any extra work a person had to do.

Include cases where the model should ask for clarification or stop. A prompt that succeeds on the easy examples can still fail at the boundary that matters.

## Keep the useful instructions

The practical question is which instruction earns its place for this task. Remove one, rerun the examples and inspect what changes. Save the results alongside the prompt so the next revision has something firmer than a recollection to beat.

The [Prompt Workbench](/lab/prompt-workbench) can keep versions and export them. [Prompt Diff](/lab/prompt-diff) shows changes between two versions. Neither tool establishes which prompt performs better. That still needs observed outputs and a stated acceptance test.
