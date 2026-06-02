---
title: "Training efficiency just became a hardware marketing scheme"
date: 2026-06-02
tags: [training-optimisation, hardware-acceleration, performance-engineering]
summary: "Fused kernels and optimised attention mechanisms are turning genuine performance gains into vendor lock-in disguised as technical innovation."
draft: false
pinned: false
---

Every new training optimisation feels like a hardware company's feature list. Fused kernels, sparse attention, optimised memory layouts. We're not getting faster training, we're getting more sophisticated vendor lock-in wrapped in performance promises.

## The efficiency theatre

NVIDIA pushes Apex with FusedAdam and FusedLayerNorm. Custom attention mechanisms promise massive speedups but only work with specific hardware configurations. These aren't neutral optimisations, they're platform strategies. The performance gains are real, but they come with invisible infrastructure dependencies that won't show up until you try to move your training pipeline somewhere else.

Engineers chase 2x speedups without asking what they're trading away. Memory bandwidth becomes the new bottleneck, but only if you're not using the right accelerator. Arithmetic intensity doubles, but your code becomes unportable. We're optimising ourselves into hardware prisons one fused kernel at a time.

## The portability tax

The real cost isn't the compute, it's the migration. Teams build training pipelines around vendor-specific optimisations, then discover their "fast" code is actually slow everywhere else. What looked like engineering excellence becomes technical debt the moment you need to change suppliers or scale beyond one provider's capacity.

Hardware acceleration used to be about making existing algorithms faster. Now it's about making better algorithms that only work on specific chips.
