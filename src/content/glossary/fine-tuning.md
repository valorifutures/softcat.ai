---
title: "Fine-Tuning"
description: "Training an existing model on new data to change its behaviour."
tags: [training, technique, models]
date: 2026-04-03
related: [foundation-model, rlhf, continual-learning]
draft: false
---

Fine-tuning takes a pre-trained model and trains it further on a specific dataset to shift its behaviour. The model keeps its general language ability but learns to follow new patterns, formats, or domain knowledge. It is how a general-purpose foundation model becomes a medical assistant or a code reviewer.

**When to use it:** Fine-tuning makes sense when prompt engineering is not enough. If you need the model to consistently follow a specific output format, speak in a particular style, or handle specialised terminology, fine-tuning bakes that into the weights rather than relying on instructions.

**How it works:** You prepare a dataset of input-output examples in the format you want. The model's weights are updated using these examples, usually with a lower learning rate than original training to avoid destroying existing capabilities. Common approaches include full fine-tuning (updating all weights) and parameter-efficient methods like LoRA (updating a small subset).

**Trade-offs:** Fine-tuning requires compute, data preparation, and ongoing maintenance as base models get updated. For many use cases, RAG or strong system prompts achieve similar results with less effort. But when they do not, fine-tuning is the next step up.
