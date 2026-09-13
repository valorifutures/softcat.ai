---
title: "Review a change for a concrete failure"
description: "Ask for a reproducible defect tied to the supplied contract, not a generic checklist or invented repository context."
category: "code-review"
tags: ["code-review","testing","correctness"]
prompt: |
  Review the supplied code against its contract. Report concrete defects that can be demonstrated from this material.

  For each finding, give the location, a minimal triggering input, expected behaviour, observed or statically derived behaviour, and the smallest relevant fix. Label a result as derived unless you actually ran it. Do not claim access to files, callers or tests that were not supplied. Skip speculative performance claims, style preferences and praise. If no concrete defect is established, say so and list any missing evidence.

  Contract:
  {{contract}}

  Code:
  {{code}}
draft: false
recipe:
  version: 1
  reviewedAt: "2026-09-13"
  previousRevision: "e59fc7636547de6973c200c9f844f4ddfd94c549"
  when: "You can give the reviewer a small change and the behaviour it must preserve."
  inputs:
    contract: "The relevant data assumptions and expected result."
    code: "A small code excerpt with a filename or other stable location."
  exampleValues:
    contract: |
      price and quantity are non-negative numbers. A quantity of zero is valid and must cost zero. Only an absent quantity should default to one.
    code: |
      // orders.js
      export const lineTotal = ({ price, quantity }) => price * (quantity || 1);
  expected: |
    orders.js uses || to default quantity, which also replaces zero. lineTotal({ price: 12, quantity: 0 }) should return 0 but returns 12. Use an explicit missing-value default, such as quantity ?? 1 under the supplied contract, and add the zero-quantity regression test.
  checks:
    - "The finding names zero as the trigger and 12 versus 0 as the failure."
    - "It does not claim that unrelated callers or tests were inspected."
    - "The suggested change preserves valid zero values."
  limits: "This is a focused review prompt, not a security audit or a guarantee that all bugs will be found. The example failure was reproduced during this review."
  tool: "/lab/prompt-workbench"
---

The worked example is a target to inspect, not a saved response from a model. Use the checks to judge an actual result.

This template was revised during the September prompt review. The [earlier text](https://github.com/valorifutures/softcat.ai/blob/e59fc7636547de6973c200c9f844f4ddfd94c549/src/content/prompts/code-review.md) remains in Git history.
