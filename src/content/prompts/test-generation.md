---
title: "Find the test that would catch the bug"
description: "Generate small counterexamples from a behavioural contract instead of copying the implementation into tests."
category: "testing"
tags: ["testing","regression-tests","code"]
prompt: |
  Propose a minimal regression test for each distinct mismatch between the contract and the code below.

  Use the named test framework. For every test, state the input, expected result from the contract and the specific failure it is meant to catch. Do not derive the expected result by repeating the implementation. Do not invent an executed test result. If the contract is ambiguous, identify the missing decision before writing that assertion. Keep the production code unchanged.

  Framework and contract:
  {{contract}}

  Code:
  {{code}}
draft: false
recipe:
  version: 1
  reviewedAt: "2026-09-13"
  previousRevision: "e59fc7636547de6973c200c9f844f4ddfd94c549"
  when: "A short function has a clear contract and you want tests that distinguish correct from incorrect behaviour."
  inputs:
    contract: "The test framework and externally defined behaviour."
    code: "The smallest relevant function or module."
  exampleValues:
    contract: |
      JavaScript with node:test and node:assert/strict. admitted(count, limit) is true only when count is a non-negative integer strictly below limit. limit is a positive integer.
    code: |
      export const admitted = (count, limit) => count <= limit;
  expected: |
    assert.equal(admitted(-1, 10), false);
    assert.equal(admitted(10, 10), false);
    assert.equal(admitted(9, 10), true);
  checks:
    - "The negative count and equality boundary are both covered."
    - "The expected values come from the contract and expose the current implementation."
    - "The response does not say tests passed unless it actually ran them and reports the run."
  limits: "The target assertions are examples, not proof of a complete test suite. The two failure cases were reproduced directly during this recipe review."
  tool: "/lab/prompt-workbench"
---

The worked example is a target to inspect, not a saved response from a model. Use the checks to judge an actual result.

This template was revised during the September prompt review. The [earlier text](https://github.com/valorifutures/softcat.ai/blob/e59fc7636547de6973c200c9f844f4ddfd94c549/src/content/prompts/test-generation.md) remains in Git history.
