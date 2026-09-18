---
title: "Benchmark"
description: "A standardised test used to compare model performance."
tags: [evaluation, models, concept]
date: 2026-04-03
related: [llm, foundation-model, inference]
draft: false
---

A benchmark is a standardised test suite that measures how well a model performs on specific tasks. Examples include MMLU (general knowledge), HumanEval (code generation), and GPQA (graduate-level reasoning). Benchmarks give the community a common yardstick for comparing models from different labs.

**Why they matter:** Benchmarks make a comparison explicit. To interpret a score, check the test version, task selection, model, tools, time or token budget, and scoring rules. A published number is not automatically an independently reproduced result.

**The limits:** Benchmarks only measure what they test. A model can score well on MMLU but struggle with real-world tasks that require tool use or multi-step reasoning. There is also a contamination problem: if benchmark questions leak into training data, scores inflate without genuine capability improvement.

**Different tests answer different questions:** [ARC-AGI-3](https://arcprize.org/arc-agi/3) tests adaptation in unfamiliar interactive environments. That is useful evidence about learning and planning, but it does not test every cognitive domain or prove that a business workflow operates reliably.

**Before applying a score to real work:** Define what counts as success and which cases enter the denominator. Include failures, manual rescues and excluded work. Time spent acting, confidence in an answer, merged changes and successful production outcomes are different measures. [Anthropic's autonomy study](https://www.anthropic.com/research/measuring-agent-autonomy) explains why individual tool calls do not reveal complete workflow outcomes.

Our [Horizon predictions](/horizon/) use explicit resolution criteria, separate from benchmark scores. A stronger score can inform a forecast without satisfying its milestone.

*Editorial review, 18 September 2026: clarified reproducibility and the limits of transferring benchmark results to production. The original publication date is preserved.*
