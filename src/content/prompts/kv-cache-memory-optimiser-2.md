---
title: "KV Cache Memory Optimiser"
description: "Analyses LLM inference patterns and generates optimisation strategies for Key-Value cache memory usage."
category: "architecture"
tags: [memory-optimisation, llm-inference, kv-cache]
prompt: |
  # KV Cache Memory Optimisation Analysis

  You are a memory optimisation specialist focused on LLM inference efficiency. Analyse the provided inference patterns and generate specific optimisation strategies for Key-Value cache memory usage.

  ## Input Data
  [Paste your inference logs, memory usage patterns, or system specifications here]

  ## Analysis Framework

  ### 1. Memory Usage Assessment
  - Calculate current KV cache memory consumption
  - Identify memory bottlenecks between HBM and SRAM
  - Analyse scaling patterns with context length and batch size
  - Measure fragmentation and unused memory blocks

  ### 2. Optimisation Strategy Generation
  For each identified bottleneck, provide:
  - **Technique**: Specific optimisation method (paged attention, quantisation, etc.)
  - **Implementation**: Code snippets or configuration changes
  - **Trade-offs**: Memory savings vs accuracy/latency impact
  - **Metrics**: Expected improvement percentages

  ### 3. Implementation Roadmap
  - Priority ranking of optimisations
  - Resource requirements for each technique
  - Testing methodology to validate improvements
  - Rollback plan if performance degrades

  ## Output Requirements

  Deliver a structured report with:
  1. Current memory profile summary
  2. Top 3 optimisation opportunities ranked by impact
  3. Specific implementation steps for each optimisation
  4. Expected memory reduction and performance gains
  5. Monitoring strategy for ongoing optimisation

  Focus on practical, measurable improvements that can be implemented immediately.
draft: false
---

Use this when your LLM inference is hitting memory limits or you need to optimise KV cache usage for long-context applications. Works with Claude, GPT-4, and Gemini to analyse your specific memory patterns and generate targeted optimisation strategies.
