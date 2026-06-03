---
title: "Mixture-of-Experts Model Routing Efficiency Analyser"
description: "Analyses MoE model routing patterns to identify load imbalances, expert utilisation, and gating network inefficiencies."
category: "performance"
tags: [mixture-of-experts, routing-analysis, load-balancing]
prompt: |
  # MoE Routing Efficiency Analysis

  You are an expert in Mixture-of-Experts (MoE) model architectures. Analyse the routing patterns and performance metrics below to identify inefficiencies and optimisation opportunities.

  ## Model Configuration
  **Number of experts:** [number]
  **Routing strategy:** [top-k/switch/hash-based/other]
  **Expert capacity:** [tokens per expert]
  **Load balancing method:** [auxiliary loss/random routing/other]

  ## Routing Metrics
  ```
  [paste routing logs/metrics here]
  ```

  ## Performance Data
  ```
  [paste performance metrics: throughput, latency, memory usage]
  ```

  ## Analysis Requirements

  ### Expert Utilisation
  - Calculate expert load distribution across the input batch
  - Identify underutilised and overloaded experts
  - Measure routing entropy and diversity

  ### Gating Network Performance
  - Analyse confidence scores for expert selection
  - Detect routing collapse or expert death
  - Evaluate load balancing loss effectiveness

  ### Efficiency Metrics
  - Compute FLOPs utilisation vs theoretical maximum
  - Measure communication overhead between experts
  - Calculate memory efficiency per expert

  ### Bottleneck Identification
  - Identify capacity bottlenecks causing token dropping
  - Detect routing hotspots
  - Analyse gradient flow to expert parameters

  ## Recommendations
  Provide specific optimisation strategies:
  - Routing algorithm adjustments
  - Expert capacity rebalancing
  - Load balancing hyperparameter tuning
  - Architecture modifications

  Include quantified impact estimates and implementation complexity for each recommendation.
draft: false
---

Use this when profiling MoE models like Mixtral, GLaM, or Switch Transformer to optimise expert utilisation and reduce routing overhead. Works with Claude, GPT-4, and Gemini for analysing routing logs and performance telemetry.
