---
title: "Agentic Loop"
description: "The cycle where an AI model takes an action, observes the result, then decides what to do next."
tags: [agents, architecture, reasoning]
date: 2026-04-03
related: [tool-use, chain-of-thought, llm]
draft: false
---

An agentic loop is the repeated cycle of act, observe, decide that lets an AI model work through multi-step tasks. The model picks an action (like calling a tool or writing code), reads the result, then figures out what to do next. This continues until the task is done or the model decides it cannot proceed.

**Why it matters:** Without an agentic loop, a model gives you one response and stops. With one, it can break a problem into steps, handle errors, and adapt on the fly. This is the core pattern behind AI coding assistants, research agents, and autonomous workflows.

**How it works:** The loop typically runs inside a framework that manages the conversation history, tool calls, and stopping conditions. Each iteration adds the action and its result to the context, so the model has a running record of everything it has tried. The loop exits when the model signals completion, hits a token limit, or reaches a maximum number of steps.

**Watch out for:** Loops can burn through tokens quickly, especially if the model gets stuck retrying the same failed action. Good implementations include guardrails like step limits, cost caps, and fallback behaviour when progress stalls.
