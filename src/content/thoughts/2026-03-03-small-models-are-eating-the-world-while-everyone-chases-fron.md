---
title: "Small models are eating the world while everyone chases frontier performance"
date: 2026-03-03
tags: [small-models, edge-computing, deployment, efficiency]
summary: "The industry's obsession with parameter counts is missing the real revolution happening at 0.8B parameters."
draft: false
pinned: false
---

Everyone's watching the frontier model arms race while the actual deployment story is happening in the sub-billion parameter space. We're seeing production systems built on 678KB frameworks and 0.8B models that boot in milliseconds, not minutes. The future isn't about who can train the biggest model. It's about who can ship the smallest one that still works.

## The tyranny of less compute

Small models force you to be honest about what you actually need. When you've got 9B parameters instead of 900B, you can't hide sloppy prompting behind raw compute. You have to optimise for the task, not throw tokens at it until something sticks. This constraint breeds better engineering, not worse outcomes.

The economics are brutal too. Edge deployment means no API costs, no network latency, no cloud dependencies. A 0.8B model running locally beats a frontier model running remotely for most real-world tasks. Latency kills user experience faster than slightly worse accuracy.

## Intelligence per watt is the new Moore's Law

We're entering the era of intelligence per watt optimisation. Raw capability doesn't matter if it takes a data centre to run. Small models running on device memory with sub-second inference times are solving real problems whilst frontier models are still loading their attention weights.

The developers building production systems aren't waiting for GPT-6. They're shipping today with models that fit in browser cache and run on phone batteries. That's the actual AI revolution.
