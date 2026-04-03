---
title: "Mixture of Experts (MoE)"
description: "A model architecture where only a subset of specialised sub-networks (experts) activate for each token, making large models cheaper to run."
tags: [architecture, llm, efficiency, training]
date: 2026-04-03
related: [fine-tuning, context-window, embeddings]
draft: false
---

A Mixture of Experts model contains many specialised sub-networks (the experts) and a router that decides which experts handle each token. Instead of running the full model for every token, only 2–8 experts activate at a time. You get a huge model's quality at a fraction of the compute cost.

**Why it matters:** MoE is how you build a model with hundreds of billions of parameters that's still practical to serve. Models like Mixtral 8x7B, GPT-4, and Gemini 1.5 are believed to use MoE architectures. The technique lets providers offer large-model quality at smaller-model prices.

**How the routing works:**
1. A learned router scores each expert for the current token
2. The top-K experts (usually 2) are selected
3. Their outputs are weighted and combined
4. Only those K experts' parameters are loaded and computed

**Key tradeoff:** Total parameters (the full model size) vs. active parameters (what runs per token). A Mixtral 8x7B has ~46B total parameters but only ~12B active per token — similar to running a 12B dense model while having the knowledge of a 46B one.

**Watch out for:** Load balancing is tricky. If the router always picks the same experts, others never train well. Most MoE implementations include auxiliary losses to force balanced expert usage during training.
