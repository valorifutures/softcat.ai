---
title: "Lighthouse Attention"
description: "A training-only attention mechanism that delivers 1.4-1.7x speedup for long context pretraining."
url: "https://www.marktechpost.com/2026/05/16/nous-research-proposes-lighthouse-attention-a-training-only-selection-based-hierarchical-attention-that-delivers-1-4-1-7x-pretraining-speedup-at-long-context/"
status: experimental
tags: [attention-mechanism, training-optimisation, long-context, nous-research]
draft: false
---

Nous Research has released Lighthouse Attention, a clever wrapper around standard attention that speeds up long context pretraining without changing the final model. The key insight is pooling queries, keys, and values symmetrically across a multi-resolution pyramid during training, then removing the mechanism entirely afterwards.

This differs from previous approaches that only pooled keys and values. By pooling all three components, Lighthouse reduces attention complexity from O(N·S·d) to O(S²·d) whilst still running standard FlashAttention on the compressed sequence. The result is meaningful speedup without architectural changes to the final model.

We find this particularly interesting because it solves a real problem in long context training without permanent compromises. The training-only nature means you get the efficiency gains where you need them most, but deploy exactly the same architecture as standard models.

Early results on 530M parameter Llama-3 variants show the promised 1.4-1.7x speedup. Worth watching as teams scale this to larger models and longer contexts.
