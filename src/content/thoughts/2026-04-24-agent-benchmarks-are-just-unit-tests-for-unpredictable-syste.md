---
title: "Agent benchmarks are just unit tests for unpredictable systems"
date: 2026-04-24
tags: [agentic-ai, benchmarks, testing, evaluation]
summary: "We're measuring agent performance like it's deterministic software when the whole point is emergent behaviour."
draft: false
pinned: false
---

Agent benchmarks are fundamentally broken. We're trying to measure systems designed for emergence and adaptability using the same rigid metrics we built for predictable software. It's like benchmarking jazz musicians by how well they follow sheet music.

## The deterministic delusion

Terminal-Bench scores and GDPval percentages give us the illusion of scientific measurement, but they're testing contrived scenarios with known solutions. Real agent work happens in the messy spaces between defined tasks. The moment an agent encounters something genuinely novel, all our carefully crafted benchmarks become irrelevant theatre.

We've built evaluation frameworks that reward agents for being predictably good at predicted problems. That's the opposite of what we actually want from agentic systems.

## What we're actually optimising for

Every agent benchmark assumes the task is well-defined and the success criteria are clear. But the value of agents lies in their ability to work with ambiguous goals and shifting contexts. When we benchmark reasoning strategies or tool usage, we're measuring how well agents perform in sandboxes, not how they navigate the real world.

The best agents will be the ones that break our benchmarks by finding solutions we didn't anticipate. We need evaluation methods that measure adaptability, not just accuracy on curated test sets.
