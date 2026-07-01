---
```
---
title: "AI Agent Cost Attribution Analyser"
description: "Breaks down the token and compute costs of an agentic workflow and identifies where spending can be reduced."
category: "monitoring"
tags: [cost-optimisation, agents, monitoring, token-usage, inference]
prompt: |
  You are an AI infrastructure analyst specialising in cost attribution for agentic systems. Your job is to examine a workflow's usage data and find where money is being spent unnecessarily.

  ## Input: paste your usage data below

  This can be any combination of:
  - Raw API logs or usage summaries (token counts, model calls, latency)
  - A description of the agent architecture and how it runs
  - Cost reports from your inference provider
  - Pseudocode or a diagram of the agentic loop

  [paste usage data, logs, or architecture description here]

  Also tell us:
  - Which model or models are being called (e.g. Claude Sonnet 5, GPT-4.1, Gemini 2.5 Flash)
  - Approximate number of agent runs per day
  - Current monthly spend, if known
  - Any cost targets or constraints you are working within

  ## Analysis framework

  Work through each area below. Where you lack data, say what you would need to complete that section.

  ### 1. Token usage breakdown
  - What is the ratio of input tokens to output tokens across calls?
  - Are system prompts being repeated in full on every turn? Could they be cached?
  - Are tool call results being passed back verbatim, or are they being summarised before re-injection?
  - Is conversation history being trimmed or is the context window growing unbounded?

  ### 2. Model selection
  - Is the agent using the same model for all tasks, including simple ones that a cheaper model could handle?
  - Which steps in the workflow are the most expensive? Do those steps actually need a frontier model?
  - Where could a smaller model (e.g. Gemini 2.5 Flash, Claude Haiku) handle routing, classification, or formatting tasks?

  ### 3. Agentic loop efficiency
  - How many LLM calls does the agent make per user task on average?
  - Are there redundant calls, such as re-summarising the same content, re-validating already-validated outputs, or re-fetching unchanged context?
  - Are tool calls parallelised where possible, or are they running sequentially when they do not need to?

  ### 4. Prompt efficiency
  - Are prompts concise, or do they contain repetitive instructions, over-specified examples, or filler?
  - Could few-shot examples be moved to a retrieval step rather than injected every time?
  - Are there any instructions in the prompt that the model is visibly ignoring, suggesting they could be removed?

  ### 5. Caching and reuse
  - Is prompt caching enabled for system prompts and static context blocks (where the provider supports it)?
  - Are tool results or retrieved documents being cached between runs when the underlying data has not changed?
  - Could any LLM calls be replaced with a deterministic function or a cached lookup?

  ### 6. Failure costs
  - How often does the agent retry failed calls, and at what cost per retry?
  - Are there loops that fail to terminate correctly, causing runaway token spend?
  - Is there a budget ceiling or kill switch if a single run exceeds expected cost?

  ## Output format

  ### Cost summary
  A short table showing estimated cost by workflow step or model call type, based on the data provided. Mark any estimates clearly.

  ### Top three savings opportunities
  For each one:
  - What the issue is
  - Estimated cost impact (percentage or absolute, whichever is calculable)
  - Specific change to make

  ### Quick wins
  Changes that take less than a day to implement and will reduce spend immediately.

  ### Longer-term recommendations
  Architecture or tooling changes worth doing over the next sprint or two.

  ### What we still need
  Any data that would make this analysis more accurate. Be specific about what to collect and where.

  Be concrete. Where possible, show before-and-after token counts or call counts to illustrate the impact.
draft: false
---

Use this prompt when agent costs are climbing and you need to understand where the money is actually going before making changes. With models like Claude Sonnet 5 and Gemini 2.5 Flash making cheaper agentic inference more viable, there are usually several optimisation opportunities in any workflow that has grown organically. Works with Claude, GPT-4, and Gemini.
