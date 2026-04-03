---
title: "Chain-of-Thought (CoT)"
description: "A prompting approach where the model reasons step by step before giving a final answer."
tags: [prompting, reasoning, technique]
date: 2026-04-03
related: [prompt-engineering, in-context-learning, zero-shot]
draft: false
---

Chain-of-thought prompting gets a model to show its working before arriving at an answer. Instead of jumping straight to a conclusion, the model breaks the problem into intermediate steps. This consistently improves accuracy on maths, logic, and multi-step reasoning tasks.

**How to use it:** The simplest version is adding "think step by step" to your prompt. A more structured approach provides a worked example showing the reasoning format you want. Some models (like OpenAI's o-series) have chain-of-thought built into their inference process, reasoning internally before producing the final output.

**Why it works:** Transformers generate tokens one at a time. By producing intermediate reasoning tokens, the model effectively gives itself more compute to work through the problem. Each step conditions the next, reducing the chance of errors compounding silently.

**Variations:** Tree-of-thought (exploring multiple reasoning paths), chain-of-thought with self-consistency (generating several chains and picking the most common answer), and chain-of-verification (using a second pass to fact-check the reasoning).
