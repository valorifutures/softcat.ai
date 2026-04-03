---
title: "Attention Mechanism"
description: "The core operation inside a transformer model that lets it weigh how much each word relates to every other word."
tags: [architecture, models, concept]
date: 2026-04-03
related: [sparse-attention, context-window, tokenisation]
draft: false
---

Attention is the mechanism that lets transformer models figure out which parts of the input matter most for each part of the output. For every token, the model computes a score against every other token, producing a weighted map of relevance. This is how a model knows that "it" in a sentence refers to a specific noun three paragraphs earlier.

**How it works:** The input is projected into three vectors: query, key, and value. The query of one token is compared against the keys of all other tokens to produce attention weights. Those weights are applied to the values to create a context-aware representation. This happens across multiple "heads" in parallel, each learning different relationship patterns.

**Why it matters:** Before attention, models processed sequences left to right and struggled with long-range dependencies. Attention lets every token look at every other token regardless of position. This is what makes transformers so effective at language, but it also means compute scales quadratically with sequence length.

**Variants:** Multi-head attention (standard in all transformers), grouped-query attention (used in Llama and Mistral for efficiency), and sparse attention (only attending to a subset of tokens to handle longer sequences).
