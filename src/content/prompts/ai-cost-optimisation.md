---
title: "AI Cost Optimisation"
description: "Analyse your AI usage for token waste, model mismatches, and missed caching and batching opportunities."
category: "optimisation"
tags: [cost, optimisation, tokens, performance]
prompt: |
  Analyse the following AI integration for cost optimisation opportunities. Review each area and give specific, actionable recommendations.

  **Token Waste**
  - Are prompts longer than they need to be? Identify redundant instructions, repeated context, or verbose system prompts.
  - Are responses being generated at a length that exceeds what the application actually uses?
  - Is context being stuffed with irrelevant history or documents?

  **Model Selection**
  - Is the task matched to the right model tier? Flag cases where a cheaper model (e.g. Haiku) would produce equivalent results.
  - Are simple classification, extraction, or routing tasks using a frontier model unnecessarily?
  - Could any steps be replaced with deterministic logic instead of an LLM call?

  **Caching Opportunities**
  - Are identical or near-identical prompts being sent repeatedly? Identify candidates for semantic caching.
  - Could prompt prefixes be cached to reduce input token costs?
  - Are there lookup-style queries that could hit a cache before calling the model?

  **Batching**
  - Are individual items being processed one at a time when they could be batched into a single call?
  - Could async batch APIs reduce per-request costs?
  - Are there fan-out patterns that could be consolidated?

  **Architecture**
  - Is the system making unnecessary round-trips (e.g. calling the model to format data that code could format)?
  - Could retrieval be tightened to reduce context size?
  - Are there fallback chains that could be reordered by cost?

  For each recommendation, estimate the potential cost reduction (as a percentage or multiplier) and state the trade-off, if any.

  ```
  [describe your AI integration, paste code, or share usage metrics]
  ```
draft: false
---

Use this when your AI bill is climbing and you want a structured review. Covers the five main cost levers: token waste, model selection, caching, batching, and architecture.

Works best when you include your current model choices, approximate call volumes, and example prompts. The more context you give, the more specific the recommendations.
