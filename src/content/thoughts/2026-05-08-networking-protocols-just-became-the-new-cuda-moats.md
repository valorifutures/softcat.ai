---
title: "Networking protocols just became the new CUDA moats"
date: 2026-05-08
tags: [networking, infrastructure, training-clusters, protocols]
summary: "Custom networking protocols are the new way to lock competitors out of large-scale AI training."
draft: false
pinned: false
---

OpenAI's MRC protocol isn't just about making GPUs talk faster. It's about creating technical dependencies that make switching cloud providers bloody expensive. When your entire training pipeline relies on proprietary networking magic, you're not just buying compute anymore, you're buying into an ecosystem.

## The new vendor lock-in playbook

Traditional cloud lock-in was about APIs and storage formats. Now it's about packet routing and microsecond recovery times. You can't exactly rip out custom networking protocols and expect your hundred-thousand-GPU cluster to keep humming along. The switching costs just went from inconvenient to impossible.

## Everyone's building their own plumbing

AMD, Broadcom, Intel, Microsoft, and NVIDIA all backing the same protocol tells you everything. This isn't about open standards or industry collaboration. It's about creating a club where membership requires building supercomputers their way. The "open" networking protocol that somehow needs their specific hardware to work properly.

The infrastructure layer is eating the model layer. Training the next frontier model isn't just about having the best algorithms anymore, it's about having the best plumbing. And plumbing, unlike code, can't be easily replicated or reverse-engineered.
