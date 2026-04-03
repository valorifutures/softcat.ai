---
title: "Fine-Tuning"
description: "Continued training of a pre-trained model on a smaller, task-specific dataset to specialise its behaviour."
tags: [training, llm, customisation, architecture]
date: 2026-04-03
related: [retrieval-augmented-generation, context-window]
draft: false
---

Fine-tuning takes a model that already knows how to write and reason, then trains it further on examples relevant to your use case. The base model's weights are updated to shift its behaviour — making it better at your specific task, format, tone, or domain.

**Why it matters:** A general-purpose model may not follow your exact output format consistently, may not know your internal jargon, or may generate responses in the wrong register. Fine-tuning internalises those requirements rather than relying on long system prompts to instruct them each time.

**Fine-tuning vs. RAG:**
- RAG is cheaper, faster to iterate, and works when the information changes frequently
- Fine-tuning is better when the model needs to learn a new style, format, or behaviour — not just new facts
- They're not mutually exclusive; many production systems use both

**Common approaches:**
- **Supervised fine-tuning (SFT)**: Train on input/output pairs
- **LoRA / QLoRA**: Low-rank adapters that train a fraction of weights, much cheaper
- **RLHF / DPO**: Use human preferences or rankings to align model behaviour

**Watch out for:** Fine-tuned models can catastrophically forget prior capabilities (catastrophic forgetting). Always test on general benchmarks alongside your target task.
