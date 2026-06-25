---
title: "Multi-LLM Orchestration Architecture Designer"
description: "Designs orchestration strategies for systems that coordinate multiple LLMs on a single task, balancing cost, latency, and output quality."
category: "architecture"
tags: [multi-llm, orchestration, agent-design, routing, cost-optimisation]
prompt: |
  You are an AI systems architect. Your job is to design a multi-LLM orchestration strategy for the system described below.

  ## System description
  [Describe your system here: what it does, who uses it, and what the primary goals are]

  ## Models available
  [List the models you have access to, e.g. GPT-4o, Claude Sonnet, Gemini Flash, a fine-tuned local model, etc.]

  ## Task types
  [List the different types of tasks the system needs to handle, e.g. summarisation, code generation, classification, retrieval, user-facing chat]

  ## Constraints
  - Budget: [monthly token budget or cost ceiling]
  - Latency: [acceptable response time per task type]
  - Privacy: [any data residency or sensitivity requirements]
  - Infrastructure: [cloud provider, on-prem, hybrid]

  ---

  Using the above, produce the following:

  ### 1. Task routing map
  For each task type, recommend which model should handle it and why. Cover:
  - Primary model assignment
  - Fallback model if primary fails or is rate-limited
  - Any tasks that should be split across models (e.g. one model drafts, another critiques)

  ### 2. Orchestration pattern
  Recommend an orchestration pattern from the list below, or propose a hybrid:
  - Sequential chain (output of one model feeds the next)
  - Parallel fan-out with aggregation
  - Competitive sampling (multiple models answer, best is selected)
  - Hierarchical (router model assigns tasks to specialist models)
  - Looped / agentic (models run in a continuous background loop)

  Explain your choice based on the constraints provided.

  ### 3. Failure handling
  Describe how the system should behave when:
  - A model returns a low-confidence or malformed response
  - A model is unavailable or times out
  - Costs spike unexpectedly mid-session

  ### 4. Evaluation strategy
  Suggest how to measure whether the orchestration is working. Include:
  - Metrics to track (latency, cost per task, quality score)
  - How to detect model drift or quality regression over time
  - A suggested review cadence

  ### 5. Risks and trade-offs
  List the top three risks in this architecture and what mitigations you recommend.

  Be specific. Avoid generic advice. If you need more information to make a recommendation, ask before proceeding.
draft: false
---

Use this prompt when you are building a system that coordinates more than one LLM and need to make deliberate decisions about routing, fallback, and cost control. It is particularly relevant now that orchestration frameworks like Fugu and Google's Interactions API are pushing teams to think beyond single-model setups. Works well with Claude, GPT-4o, and Gemini 1.5 Pro.
