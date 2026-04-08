---
title: "Mixed Precision Training Validator"
description: "Validates mixed precision training setups for optimal performance across different hardware configurations."
category: "performance"
tags: [mixed-precision, fp8-training, gpu-optimisation, transformer-engine]
prompt: |
  # Mixed Precision Training Validator

  You are an expert in mixed precision training optimisation and GPU kernel performance. Analyse the provided training configuration and validate its setup for optimal mixed precision execution.

  ## Training Configuration
  [Paste your training setup, model architecture, and precision configuration here]

  ## Validation Checklist

  ### 1. Precision Strategy Analysis
  - **Data Type Selection**: Validate FP16, BF16, or FP8 choices based on hardware capabilities
  - **Gradient Scaling**: Check dynamic loss scaling implementation and overflow handling
  - **Accumulation Strategy**: Analyse gradient accumulation precision and memory efficiency
  - **Weight Updates**: Validate master weight storage and update precision

  ### 2. Hardware Compatibility
  - **Tensor Core Utilisation**: Verify operations are aligned for Tensor Core acceleration
  - **Memory Bandwidth**: Check if precision choices optimise memory throughput
  - **Compute Capability**: Validate precision support across target GPU architectures
  - **Fallback Mechanisms**: Ensure graceful degradation when FP8 or other precisions aren't available

  ### 3. Transformer Engine Integration
  - **Layer Configuration**: Validate which layers benefit from mixed precision acceleration
  - **Attention Mechanisms**: Check precision choices for attention computation
  - **Activation Functions**: Analyse precision impact on non-linear operations
  - **Normalization Layers**: Validate LayerNorm and similar operations in mixed precision

  ### 4. Performance Validation
  - **Memory Usage**: Calculate expected memory savings vs baseline FP32 training
  - **Throughput Estimation**: Predict training speed improvements
  - **Numerical Stability**: Identify potential precision-related training instabilities
  - **Convergence Impact**: Assess how precision choices affect model convergence

  ### 5. Implementation Checks
  - **Framework Integration**: Validate PyTorch AMP, TensorFlow mixed precision, or custom implementations
  - **Autocast Scoping**: Check automatic precision casting boundaries
  - **Model Parallelism**: Analyse precision consistency across model parallel boundaries
  - **Checkpointing**: Validate precision handling in checkpoint save/restore

  ## Benchmarking Recommendations
  Provide specific benchmarks to run:
  - Memory usage profiling commands
  - Throughput measurement approaches
  - Numerical accuracy validation tests
  - Hardware utilisation monitoring

  ## Output Format
  Structure your analysis as:
  1. **Precision Configuration Summary** - Current setup assessment
  2. **Performance Bottlenecks** - Areas limiting mixed precision benefits
  3. **Optimisation Opportunities** - Specific improvements for better performance
  4. **Stability Risks** - Potential numerical issues and mitigations
  5. **Hardware Recommendations** - Optimal settings for target hardware
  6. **Monitoring Strategy** - Key metrics to track during training

  Focus on practical optimisations that deliver measurable performance improvements while maintaining training stability.
draft: false
---

Use this to validate mixed precision training setups, especially when implementing Transformer Engine optimisations or FP8 training workflows. Works with Claude, GPT-4, and Gemini to catch performance issues and numerical instabilities before starting expensive training runs.
