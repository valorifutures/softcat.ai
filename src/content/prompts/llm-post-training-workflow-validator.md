---
title: "LLM Post-Training Workflow Validator"
description: "Validates automated post-training pipelines for LLMs including dataset preparation, training execution, and evaluation cycles."
category: "testing"
tags: [llm-training, post-training, automation, validation]
prompt: |
  # LLM Post-Training Workflow Validator

  You are an expert in validating automated machine learning pipelines for large language model post-training. Your task is to create comprehensive validation frameworks for end-to-end training workflows.

  ## Training Pipeline Details
  **Base Model:** [model name and size]
  **Training Type:** [fine-tuning, RLHF, DPO, etc.]
  **Infrastructure:** [training setup details]
  **Automation Framework:** [ml-intern, custom pipeline, etc.]

  ## Pipeline Configuration
  ```
  [paste training configuration, hyperparameters, or pipeline definition]
  ```

  ## Dataset Information
  **Training Data:** [describe datasets]
  **Evaluation Data:** [describe eval sets]
  **Data Processing:** [preprocessing steps]

  ## Validation Framework Required

  ### 1. Data Pipeline Validation
  Create tests for:
  - Dataset integrity checks (corruption, format consistency)
  - Data quality metrics (duplication, length distribution, toxicity)
  - Train/validation/test split verification
  - Tokenisation consistency across pipeline stages
  - Data versioning and reproducibility

  ### 2. Training Process Validation
  Validate:
  - Hyperparameter range checking and sensibility
  - Training script execution environment setup
  - GPU memory utilisation and overflow prevention
  - Gradient accumulation correctness
  - Learning rate scheduling validation
  - Checkpoint saving and recovery mechanisms

  ### 3. Model Quality Checkpoints
  Define validation points for:
  - Loss curve anomaly detection
  - Perplexity threshold monitoring
  - Early stopping criteria validation
  - Overfitting detection metrics
  - Model convergence indicators

  ### 4. Evaluation Pipeline Testing
  Create tests for:
  - Automated benchmark execution
  - Evaluation metric calculation correctness
  - Comparison against baseline models
  - Human evaluation integration
  - Result aggregation and reporting

  ### 5. Infrastructure Resilience
  Test for:
  - Training interruption and resume capability
  - Multi-GPU synchronisation validation
  - Storage capacity monitoring
  - Network failure recovery
  - Resource allocation efficiency

  ### 6. End-to-End Integration
  Validate:
  - Complete pipeline execution without intervention
  - Artifact generation and storage
  - Model deployment readiness
  - Documentation and metadata generation
  - Reproducibility from configuration files

  ## Deliverables
  1. **Validation Test Suite** - Automated tests for each pipeline stage
  2. **Quality Gates** - Pass/fail criteria with thresholds
  3. **Monitoring Dashboard** - Real-time pipeline health checks
  4. **Failure Recovery Procedures** - Automated rollback and retry logic
  5. **Performance Baselines** - Expected execution times and resource usage

  Focus on creating robust validation that catches issues before expensive training runs complete.
draft: false
---

Essential for validating automated LLM training pipelines before committing significant compute resources. Works with Claude, GPT-4, and Gemini to create thorough validation frameworks that catch data issues, training problems, and infrastructure failures early in the pipeline.
