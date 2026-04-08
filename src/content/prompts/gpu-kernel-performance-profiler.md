---
title: "GPU Kernel Performance Profiler"
description: "Analyses GPU kernel performance bottlenecks and suggests optimisation strategies for CUDA and OpenCL code."
category: "performance"
tags: [gpu-optimization, cuda, performance-analysis]
prompt: |
  # GPU Kernel Performance Analysis

  You are an expert GPU performance engineer. Analyse the provided kernel code and performance metrics to identify bottlenecks and suggest optimisations.

  ## Code to analyse:
  ```
  [paste GPU kernel code here]
  ```

  ## Performance metrics (if available):
  ```
  [paste profiling data - occupancy, memory bandwidth, execution time, etc.]
  ```

  ## Target GPU architecture:
  [specify target GPU - A100, H100, RTX 4090, etc.]

  ## Analysis framework:

  ### 1. Memory Access Patterns
  - Identify coalescing issues
  - Check for bank conflicts in shared memory
  - Analyse global memory access patterns
  - Suggest memory layout optimisations

  ### 2. Compute Utilisation
  - Calculate theoretical vs actual occupancy
  - Identify register pressure issues
  - Check for divergent branching
  - Analyse instruction throughput

  ### 3. Specific Recommendations
  For each bottleneck identified:
  - Root cause explanation
  - Specific code changes needed
  - Expected performance improvement
  - Any trade-offs involved

  ### 4. Optimised Code Snippet
  Provide a rewritten version of the most critical kernel section with optimisations applied.

  ### 5. Profiling Strategy
  Suggest specific nvprof/nsight commands or tools to validate improvements.

  Focus on actionable changes that will measurably improve performance on the target architecture.
draft: false
---

Use this when optimising GPU kernels for ML training, inference, or compute workloads. Particularly relevant for teams working with custom CUDA kernels, transformer optimisations, or high-performance computing applications. Works with Claude, GPT-4, and Gemini.
