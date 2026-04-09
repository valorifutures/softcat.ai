---
title: "Benchmark"
description: "A standardised test used to compare model performance."
tags: [evaluation, models, concept]
date: 2026-04-03
related: [llm, foundation-model, inference]
draft: false
---

A benchmark is a standardised test suite that measures how well a model performs on specific tasks. Examples include MMLU (general knowledge), HumanEval (code generation), and GPQA (graduate-level reasoning). Benchmarks give the community a common yardstick for comparing models from different labs.

**Why they matter:** Without benchmarks, model comparisons would be entirely vibes-based. They provide reproducible scores that track progress over time. When a lab claims their new model is better, benchmarks are how the rest of the field checks that claim.

**The limits:** Benchmarks only measure what they test. A model can score well on MMLU but struggle with real-world tasks that require tool use or multi-step reasoning. There is also a contamination problem: if benchmark questions leak into training data, scores inflate without genuine capability improvement.

**Current state:** The field is moving toward harder, more practical benchmarks like SWE-bench (real GitHub issues) and GAIA (multi-step research tasks). Arena-style evaluations like Chatbot Arena, where humans rank model outputs head to head, have also gained traction as a complement to static test suites.
