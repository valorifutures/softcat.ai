---
title: Test-Time Training (TTT)
description: A method where a model runs gradient updates during inference, using its current input as training data to adapt on the fly.
tags:
  - training
  - inference
  - memory
  - efficiency
  - research
date: 2026-04-03
related:
  - sparse-attention
  - continual-learning
draft: false
---

Test-Time Training (TTT) is a method where a model continues learning during inference itself, running gradient updates using the specific input it has been given as training data. Unlike standard inference where model weights are frozen, TTT lets the model adapt to new context without a full retraining cycle, giving it a form of working memory that is active for the duration of a session. NVIDIA highlighted this approach in March 2026 as a solution to long-context memory that maintains constant inference latency regardless of how much context is provided.

In practice, a TTT-enabled model can be handed a 500-page technical manual at inference time and update its own weights to better answer questions about that document, without any offline fine-tuning step.

Related terms: sparse-attention (an alternative architectural approach to long context), continual-learning (a related idea about accumulating knowledge over time without forgetting).
