---
title: "Memory is the new context window"
date: 2026-03-01
tags: [agents, memory, architecture, persistence]
summary: "The shift from stateless chat to persistent AI agents changes everything about how we build and deploy AI systems."
draft: false
pinned: false
---

We're watching the death of the ephemeral AI assistant. Every major release now ships with some form of persistent memory, from Anthropic's Claude to the new wave of agent frameworks. The industry has finally figured out what anyone who's worked with a forgetful colleague already knew: intelligence without memory is just expensive pattern matching.

## The infrastructure follows the paradigm

This shift rewrites the entire stack. Instead of optimising for token throughput, we're building for state persistence. Memory management becomes as critical as model weights. The economics change too, from pay-per-prompt to subscription models that can amortize the cost of maintaining context across sessions.

Look at the recent agent releases. They all solve the same core problem: how do you maintain coherent state across interactions? The technical approaches vary, but the goal is identical.

## But memory creates new problems

Persistent agents introduce complications that stateless models never had. Who owns the memories? How do you version control an agent's evolving worldview? What happens when an agent's accumulated context becomes poisoned or outdated?

We're trading the simplicity of clean slate interactions for the messiness of ongoing relationships. That's probably the right trade, but we're still learning how to manage it at scale.
