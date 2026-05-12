---
title: "Memory bandwidth just became the new CUDA bottleneck"
date: 2026-05-12
tags: [inference, bandwidth, hardware-optimization]
summary: "Whilst everyone obsessed over compute cores, memory bandwidth quietly became the real constraint choking AI performance."
draft: false
pinned: false
---

We've been solving the wrong problem. Whilst the entire industry fought over compute units and threw billions at bigger chips, memory bandwidth crept up and strangled our models. The new research coming out proves what we should have seen months ago: moving data, not processing it, is what's killing our inference speeds.

## The bandwidth reality check

Every major lab is suddenly announcing bandwidth optimisations. Meta and Stanford claim 50% reductions in memory bandwidth requirements. Sakana and NVIDIA are celebrating 20% speedups through sparsity. This isn't coincidence, it's acknowledgement. We built models that our hardware can't actually feed fast enough. The compute exists, but the pipes are too narrow.

## Sparse is the new dense

The real insight here isn't just that we need faster memory. It's that model architectures designed around memory constraints look completely different. Sparsity patterns, byte-level processing, efficient attention mechanisms. These aren't optimisations anymore, they're requirements. Dense models are becoming luxury items we can't afford to run.

The next generation of model designers won't be thinking about parameter counts or layer depths. They'll be thinking about memory access patterns and bandwidth utilisation. Because all the compute in the world means nothing if you can't keep it fed.
