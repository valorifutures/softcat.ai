---
title: "Testing frameworks just became AI's weakest link"
date: 2026-04-19
tags: [testing, quality-assurance, property-based-testing, ai-systems]
summary: "While everyone obsesses over model capabilities, we're shipping AI systems with testing practices from 2015."
draft: false
pinned: false
---

The industry has convinced itself that bigger models solve everything. Meanwhile, we're deploying AI systems with testing frameworks that wouldn't pass muster for a basic web app. Property-based testing isn't just good practice anymore, it's the difference between production AI that works and expensive hallucination machines.

## Unit tests can't catch emergent behaviour

Traditional testing assumes you know what your system should do. Write a test, check the output, ship it. AI systems laugh at this approach. They generate novel outputs, combine concepts in unexpected ways, and fail in modes you never considered. Your carefully crafted test cases cover maybe 0.1% of the actual behaviour space.

Property-based testing flips this around. Instead of testing specific inputs, you define invariants that should always hold true. The framework generates thousands of test cases automatically, hunting for edge cases that break your assumptions. When your AI agent starts booking flights to Mars instead of Manchester, you'll know why.

## Differential testing is the reality check we need

The real breakthrough isn't fancy new test types, it's differential testing between models. Run the same prompt through GPT, Claude, and your fine-tuned model. Compare outputs not for exact matches, but for semantic consistency and safety properties. When they disagree dramatically, you've found either a bug or a capability gap worth investigating.

We're building systems that make decisions about money, health, and safety. Testing them like they're deterministic functions is professional negligence.
