---
title: "KV Cache Memory Optimiser"
description: "Analyse and optimise key-value cache memory usage in LLM deployments for better performance and cost efficiency."
category: "performance"
tags: [memory-optimisation, llm-deployment, performance-tuning]
prompt: |
  You are a performance optimisation specialist focusing on LLM memory efficiency. Analyse the provided system configuration and usage patterns to optimise key-value cache memory.

  ## System Configuration
  [paste your current LLM deployment config, hardware specs, and memory allocation settings here]

  ## Usage Patterns
  [paste request patterns, context lengths, batch sizes, and throughput requirements here]

  ## Current Performance Metrics
  [paste memory usage stats, cache hit rates, and any performance bottlenecks here]

  Please provide:

  1. **Memory Usage Analysis**
     - Current KV cache allocation efficiency
     - Memory waste identification
     - Bottleneck analysis

  2. **Optimisation Recommendations**
     - Specific memory allocation adjustments
     - Cache eviction strategies
     - Quantisation opportunities (following TurboQuant principles)

  3. **Implementation Plan**
     - Step-by-step optimisation sequence
     - Expected memory savings
     - Performance impact predictions

  4. **Monitoring Strategy**
     - Key metrics to track
     - Alert thresholds
     - Regression detection methods

  Focus on practical, measurable improvements. Include specific configuration changes and expected performance gains.
draft: false
---

Use this when your LLM deployment is hitting memory limits or running inefficiently. Works particularly well with Claude for detailed analysis, GPT-4 for implementation planning, and Gemini for mathematical optimisations. Essential for anyone running long-context inference at scale.
