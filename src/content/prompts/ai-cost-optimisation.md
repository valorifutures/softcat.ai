---
title: "Reconcile an AI bill before proposing savings"
description: "Calculate the supplied text-token charges and separate measured usage from unpriced optimisation ideas."
category: "cost"
tags: ["cost","tokens","evaluation"]
prompt: |
  Analyse the supplied usage record without inventing savings.

  First reconcile the text-token cost from the given input and output rates. Show the counts and arithmetic. Treat missing counts, fees or discounts as unknown. Then identify repeated work visible in the record and propose one small change to test, including a quality or correctness check. Do not promise equivalent model quality, a cache discount or a percentage saving without the required data.

  Usage and rates:
  {{usage}}
draft: false
recipe:
  version: 1
  reviewedAt: "2026-09-13"
  previousRevision: "e59fc7636547de6973c200c9f844f4ddfd94c549"
  when: "You have actual usage counts or a clearly labelled planning fixture and want to understand the bill first."
  inputs:
    usage: "Per-call input/output counts, units, model or provider, dated rates and any known charges or discounts."
  exampleValues:
    usage: |
      Illustrative uncached text-only fixture, not a live bill.
      Three calls have input counts 1000, 2200 and 3400 tokens. Each reply has 200 tokens.
      Input rate: USD 3 per million tokens. Output rate: USD 15 per million tokens.
      Each later call repeats the first 1000-token prefix. No cache eligibility, cache price or quality measurements have been supplied.
  expected: |
    Total input: 6,600 tokens, costing USD 0.0198. Total output: 600 tokens, costing USD 0.009. Combined supplied text-token cost: USD 0.0288. The prefix is repeated on later calls, but caching savings cannot be priced without eligibility and rates. A small cache or context-reduction trial needs a task-quality check.
  checks:
    - "Input and output rates are applied separately, with the million-token unit preserved."
    - "The combined fixture cost is USD 0.0288."
    - "No unsupported cache percentage or claim of equal model quality appears."
  limits: "The arithmetic was checked, but the fixture is not a provider bill. Routing, caching, reasoning, tools and other charges need their own records."
  tool: "/lab/token-cost"
---

The worked example is a target to inspect, not a saved response from a model. Use the checks to judge an actual result.

This template was revised during the September prompt review. The [earlier text](https://github.com/valorifutures/softcat.ai/blob/e59fc7636547de6973c200c9f844f4ddfd94c549/src/content/prompts/ai-cost-optimisation.md) remains in Git history.
