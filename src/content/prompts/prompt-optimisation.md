---
title: "Shorten a prompt without losing a rule"
description: "Compress repeated wording while preserving explicit constraints and showing how to check the revision."
category: "prompt-engineering"
tags: ["prompting","editing","evaluation"]
prompt: |
  Shorten the prompt below without changing its task, required output or boundaries.

  Return the revised prompt, then a compact requirement map showing where every original rule survives. Do not add new constraints or remove an abstention rule to save words. If rules conflict, identify the conflict instead of silently choosing one. Suggest two small test inputs that could expose a lost requirement. Do not promise that a shorter prompt will improve answer quality.

  Original prompt:
  {{original}}
draft: false
recipe:
  version: 1
  reviewedAt: "2026-09-13"
  previousRevision: "e59fc7636547de6973c200c9f844f4ddfd94c549"
  when: "A working prompt repeats itself and you want a reviewable edit."
  inputs:
    original: "The complete prompt, including constraints and any abstention rule."
  exampleValues:
    original: |
      Please summarise the supplied source. Make the answer exactly three bullet points. Please do not write an introduction or a conclusion. Use only the supplied source and do not add outside facts. If the source does not answer a requested point, write UNKNOWN for that point. Remember that the answer must contain exactly three bullets.
  expected: |
    Summarise the supplied source in exactly three bullets, with no introduction or conclusion. Use no outside facts. Write UNKNOWN for any requested point the source cannot answer.
  checks:
    - "Exactly three bullets, no surrounding prose and source-only answers remain required."
    - "The UNKNOWN rule survives unchanged in meaning."
    - "The requirement map identifies both duplicate and unique rules."
  limits: "Compare revisions on the same task set. A lower estimated input cost is not evidence of better answers."
  tool: "/lab/prompt-diff"
---

The worked example is a target to inspect, not a saved response from a model. Use the checks to judge an actual result.

This template was revised during the September prompt review. The [earlier text](https://github.com/valorifutures/softcat.ai/blob/e59fc7636547de6973c200c9f844f4ddfd94c549/src/content/prompts/prompt-optimisation.md) remains in Git history.
