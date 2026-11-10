---
title: "Reading a text-cost estimate"
date: 2026-04-03
description: "Follow repeated conversation history, inspect parsed messages and distinguish missing output from a free reply."
labUrl: "/lab/token-cost"
status: active
tags: [tokens, cost, pricing, calculator]
draft: false
review:
  reviewedAt: "2026-09-13"
  previousRevision: "2ad8c7664293603ebde46ca9332fd17aae1b0fc5"
  summary: "Removed the unsupported claim of roughly 15 percent tokenizer accuracy. The guide now explains transcript validation, repeated system history and input-only estimates."
  evidence:
    - "https://github.com/valorifutures/softcat.ai/pull/213"
---

## An estimate, not a usage record

The calculator applies dated input and output rates to a character-based token estimate. It is not the selected model's tokenizer. There is no claimed percentage accuracy.

Use [Model Comparison](/lab/model-comparison) when you already have token counts from an actual tokenizer or provider usage record.

## The history is charged again

Conversation mode assumes all previous text is sent on each later call. System instructions are included in that repeated input.

In the worked conversation checked live during the September repair, the three calls contained approximately 11, 45 and 71 input tokens. The two supplied replies contained 24 and 16 tokens. The last user message had no supplied reply, so its planned call was labelled input-only.

The estimate for those supplied tokens was USD 0.000981 at the recorded Sonnet 4 rates. It was not an actual bill or a model run.

## Inspect the parser before the price

Role-labelled text must account for the whole transcript. An unlabelled prefix, an assistant reply without a user request or an unsupported message format produces an error instead of silently losing text.

The strict JSON mode accepts an array of text messages with only role and content fields. It preserves literal role labels and code fences inside a message. Tool calls, images, audio and extra fields are outside this calculator's scope.

## Keep the omissions visible

Missing output is unknown, not free. The report includes only the supplied text and flags the last input-only call.

Caching, hidden reasoning, tool charges, message overhead and other provider fees are excluded. The page also checks the recorded context and output limits. Copy or download keeps the original text, assumptions and source dates. Inputs stay in the page and are not saved.
