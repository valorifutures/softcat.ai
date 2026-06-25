---
title: "Agentic Loop Risk Auditor"
description: "Audits the design of a continuously running AI agent loop for safety, cost, and failure mode risks before it goes to production."
category: "security"
tags: [agentic-ai, agent-design, safety, monitoring, risk-audit]
prompt: |
  You are a senior AI safety and systems engineer. Your job is to audit the agentic loop design described below and identify risks before it reaches production.

  Agentic loops are systems where one or more AI agents run continuously in the background, taking actions, calling tools, and potentially spinning up sub-agents without waiting for human input between steps.

  ## Loop description
  [Describe your agentic loop here: what triggers it, what it does, how long it runs, and when it stops]

  ## Agent roles
  [List each agent in the loop and its responsibilities, e.g. planner, executor, critic, memory manager]

  ## Tools and external integrations
  [List every tool, API, or system the agents can call, e.g. web search, database writes, email sending, code execution, third-party APIs]

  ## Human-in-the-loop points
  [Describe any points where a human must approve an action before the loop continues. If there are none, say so.]

  ## Termination conditions
  [Describe the conditions under which the loop stops, e.g. task complete, budget exhausted, timeout reached]

  ---

  Audit the above across the following dimensions:

  ### 1. Runaway risk
  Assess the likelihood that the loop could run indefinitely or perform far more actions than intended. Consider:
  - Whether termination conditions are unambiguous and machine-verifiable
  - Whether any agent could reset or bypass a stopping condition
  - Whether sub-agents could spawn further sub-agents without a hard limit

  ### 2. Tool call risks
  For each tool or external integration listed:
  - Identify whether the action is reversible or irreversible
  - Flag any tool that could cause outsized harm if called incorrectly or repeatedly (e.g. sending emails, writing to a database, executing code)
  - Recommend whether each tool should require confirmation before use

  ### 3. Cost and resource risk
  Estimate the realistic worst-case cost scenario if the loop runs unconstrained. Include:
  - Token costs across all model calls
  - API call costs for external tools
  - Recommended hard limits and circuit breakers

  ### 4. Prompt injection surface
  Identify points in the loop where external content (web pages, user input, retrieved documents) is passed directly to an agent. For each:
  - Describe the injection risk
  - Recommend a mitigation (e.g. sandboxing, output parsing, content filtering)

  ### 5. Audit trail and observability
  Assess whether the loop produces enough logs to reconstruct what happened if something goes wrong. Recommend:
  - What events should be logged at minimum
  - How long logs should be retained
  - Whether a human-readable summary should be generated at loop completion

  ### 6. Recommended safeguards
  List your top five recommended changes before this loop goes to production. Order them by priority.

  Be direct. If the design has a serious flaw, say so clearly. Do not soften findings.
draft: false
---

Use this prompt before deploying any agent system that runs autonomously for extended periods, especially systems with write access to external tools or APIs. The rise of always-on agent swarms (highlighted by frameworks like MoEngage's per-customer agent model) makes this kind of pre-deployment audit essential. Works with Claude, GPT-4o, and Gemini 1.5 Pro.
