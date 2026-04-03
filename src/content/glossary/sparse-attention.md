---
title: Sparse Attention
description: A transformer efficiency technique where each token attends only to a relevant subset of other tokens, enabling near-linear scaling with context length.
tags:
  - architecture
  - transformers
  - efficiency
  - long-context
  - research
date: 2026-04-03
related:
  - test-time-training
  - retrieval-augmented-generation
draft: false
---

Sparse attention is a technique for making transformer models more efficient by having each token attend only to a relevant subset of other tokens, rather than every token in the sequence. Standard full attention scales quadratically with context length, which becomes prohibitively expensive as documents grow. Sparse attention achieves near-linear scaling instead. A March 2026 paper demonstrated end-to-end processing at 100 million tokens using this approach.

In practice, sparse attention allows a model to summarise or reason over an entire book, codebase, or legal document in a single pass without the cost blowing out proportionally.

Related terms: test-time-training (another technique for handling long context), retrieval-augmented-generation (an alternative strategy that avoids long contexts by fetching only relevant chunks).
