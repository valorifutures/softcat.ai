---
title: "Model compilers just turned optimisation into a black art nobody understands"
date: 2026-05-13
tags: [model-optimisation, inference-performance, developer-tooling]
summary: "Everyone's chasing 50% speedups with sparse kernels and custom CUDA code, but we're building a tower of optimisation hacks that breaks every time someone changes the model."
draft: false
pinned: false
---

We're watching the same mistakes that plagued C++ compilers in the 90s, except this time it's happening to neural networks. Every week brings another optimiser promising massive speedups through sparsity tricks, custom kernels, or clever memory layouts. The problem is nobody understands what any of these tools actually do to your model.

## The optimisation stack is becoming undebuggable

Aurora fixes dead neurons in Muon. TwELL adds L1 regularisation for sparsity. Byte transformers skip tokenisation entirely. Each technique works in isolation, but try combining them and you're debugging CUDA kernels at 3am wondering why your loss curves look like modern art. We're building inference pipelines that require PhD-level understanding of GPU architecture just to troubleshoot.

## Performance gains are becoming maintenance nightmares

Getting 20% faster inference is brilliant until you realise your entire deployment pipeline depends on custom kernels that only work with specific hardware configurations. Change your batch size? Recompile everything. Swap out a layer? Start over. The tools that promise to make models faster are making our systems more brittle.

We need optimisation frameworks that explain their decisions, not just deliver speedups. Until then, we're trading short-term performance gains for long-term technical debt that most teams can't afford to debug.
