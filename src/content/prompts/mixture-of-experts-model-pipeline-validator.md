---
title: "Mixture-of-Experts Model Pipeline Validator"
description: "Validates MoE model training and deployment pipelines for routing efficiency and load balancing."
category: "testing"
tags: [moe-models, pipeline-validation, routing-efficiency]
prompt: |
  # Mixture-of-Experts Model Pipeline Validator

  You are an expert in validating MoE (Mixture-of-Experts) model training and deployment pipelines. Analyse the provided configuration and identify potential issues with routing efficiency, load balancing, and expert utilisation.

  ## Pipeline Configuration
  [paste your MoE pipeline configuration here]

  ## Validation Areas

  ### Expert Routing Analysis
  - Check router learning rates and gradient flow
  - Validate expert capacity factors and load balancing
  - Analyse token dropping policies and aux loss weights
  - Review expert selection temperature and top-k settings

  ### Load Distribution Validation
  - Examine expert utilisation patterns across batches
  - Check for expert collapse or under-utilisation
  - Validate load balancing auxiliary losses
  - Review communication overhead between experts

  ### Performance Optimisation
  - Analyse memory usage per expert and routing overhead
  - Check for efficient expert parallelisation strategies
  - Validate gradient synchronisation across experts
  - Review inference latency with different expert counts

  ### Training Stability
  - Check for router instability during training
  - Validate expert weight initialisation strategies
  - Analyse convergence patterns and loss scaling
  - Review checkpoint and recovery mechanisms

  ## Output Requirements

  Provide a structured report with:
  1. **Critical Issues** - Problems that could cause training failure
  2. **Performance Bottlenecks** - Areas affecting throughput or memory
  3. **Load Balancing Issues** - Expert utilisation problems
  4. **Optimisation Recommendations** - Specific parameter adjustments
  5. **Testing Strategy** - Validation tests to run before deployment

  Include specific configuration changes with exact parameter values where applicable.
draft: false
---

Use this validator when setting up MoE model training pipelines or debugging expert routing issues. Particularly useful for catching load balancing problems that could lead to expert collapse during training. Works with Claude, GPT-4, and Gemini for comprehensive MoE pipeline analysis.
