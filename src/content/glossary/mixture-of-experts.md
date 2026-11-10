---
title: "Mixture of Experts (MoE)"
description: "An architecture where only a subset of the model's parameters activate for each input."
tags: [architecture, models, performance]
date: 2026-04-03
related: [llm, foundation-model, inference]
draft: false
---

Mixture of Experts is a model architecture where the network contains many "expert" sub-networks, but only a few activate for any given input. A routing mechanism decides which experts handle each token. This means you can have a model with hundreds of billions of total parameters but only use a fraction of them per forward pass, keeping inference costs manageable.

**Why it matters:** MoE lets you build models that are much larger in total capacity without proportionally increasing the compute needed to run them. Mixtral 8x7B, for example, has 47 billion total parameters but only activates about 13 billion per token. You get the knowledge of a big model at the cost of a smaller one.

**How routing works:** A small gating network takes each token and assigns it to the top-K experts (usually 2). The outputs of those experts are combined based on the gating weights. The router is trained alongside the experts so it learns which expert is best for which types of input.

**Trade-offs:** MoE models need more memory to store all expert weights, even though only some are active at any time. This makes them harder to run on consumer hardware. They can also suffer from load imbalancing, where some experts get overused and others are underutilised, requiring careful training techniques to keep things even.
