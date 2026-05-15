---
title: "Inference harnesses just turned model improvement into a configuration management problem"
date: 2026-05-15
tags: [inference-optimisation, model-agnostic, llm-performance]
summary: "We're spending billions training better models when the real gains come from better prompting infrastructure."
draft: false
pinned: false
---

The dirty secret of LLM performance isn't the models. It's everything wrapped around them. While we obsess over parameter counts and training runs, the biggest performance jumps are coming from inference harnesses that treat prompting like the engineering discipline it always should have been.

## The wrapper is the product

Model-agnostic harnesses are proving that the same optimisation pipeline can boost any LLM without touching weights. We're not talking about simple prompt templates here. These systems handle multi-turn conversations, context management, output formatting, and error recovery as configurable infrastructure components. The model becomes a commodity. The harness becomes the moat.

## Configuration beats computation

Training a new model costs millions and months. Tuning an inference harness costs engineer-hours and deploys instantly. When a single harness can improve eight different models across coding benchmarks, we're looking at the wrong problem entirely. The performance ceiling isn't model architecture. It's prompt engineering maturity.

The real question isn't which model will win. It's which team builds the best infrastructure for making any model perform like the best model.
