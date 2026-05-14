---
title: "Training optimisers just became the most important job nobody talks about"
date: 2026-05-14
tags: [training-optimisation, model-architecture, infrastructure]
summary: "While everyone obsesses over model parameters, the algorithms that actually train them are quietly becoming the biggest bottleneck in AI development."
draft: false
pinned: false
---

We spend months debating whether a model needs 7B or 70B parameters, then throw Adam at it and call it a day. Meanwhile, the optimiser is doing all the heavy lifting, and most of us treat it like a black box that just works. That's changing fast, and it's about to become the new frontier.

## The optimiser arms race is real

Look at what's happening under the hood. Aurora fixes dead neurons that Muon accidentally kills. Token Superposition Training cuts wall-clock time by 2.5x without touching the model architecture. These aren't incremental improvements, they're fundamental advances in how we actually get models to learn. The gap between good and bad optimisation is becoming massive.

## Architecture gets the headlines, optimisation gets the results

Everyone talks about attention mechanisms and parameter counts because they're easy to measure. But the optimiser determines whether your expensive compute budget trains a brilliant model or an expensive paperweight. We're seeing 16x throughput improvements and 90% accuracy gains just from smarter training algorithms.

The next unicorn won't be the company with the cleverest architecture. It'll be whoever figures out how to train models faster, cheaper, and more reliably than everyone else.
