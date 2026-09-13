---
title: "Planning a context budget"
date: 2026-04-03
description: "What the Context Budget Planner counts, how it handles conflicting limits and what its result can establish."
labUrl: "/lab/context-window"
status: active
tags: [context, models, planning, comparison]
draft: false
review:
  reviewedAt: "2026-09-13"
  previousRevision: "2ad8c7664293603ebde46ca9332fd17aae1b0fc5"
  summary: "The original eight-model slider has been replaced by a whole-request budget. This guide now describes the implemented planner and its limits."
  evidence:
    - "https://github.com/valorifutures/softcat.ai/pull/212"
---

## Count the whole request

The planner adds instructions, repeated history, documents or new input, tool definitions or results, reply allowance and unused headroom. Enter token counts from a tokenizer or usage record, or use a clearly labelled estimate.

The three built-in workloads are illustrative. They are not measured production requests.

## Check two different limits

A request can fit inside the context window and still ask for too many output tokens. The planner checks the recorded context limit and the separate output cap.

The model catalogue can disagree with its top-provider record. The planner shows both and uses the smaller known context value as a planning limit. Unknown limits stay unknown.

## A result worth checking

During the September live check, the large-code example totalled 274,000 tokens. Against the recorded Sonnet 4 planning limit of 200,000, it was 74,000 over budget.

The long-reply example totalled 85,000 tokens, but its 70,000-token reply exceeded the separately recorded 64,000-token output cap. Those two failures mean different things.

## Take the assumptions with you

Copy or download preserves the input counts, exact limits and their dated source. You can compare the same request across the tracked roster.

No model is called, and the planner does not guarantee route acceptance, good retrieval or useful output. Limits can change. Check the dates inside the tool before relying on a plan.
