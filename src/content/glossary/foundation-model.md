---
title: "Foundation Model"
description: "A large model trained on massive data that can be adapted for many tasks."
tags: [models, concept, training]
date: 2026-04-03
related: [llm, fine-tuning, multi-modal]
draft: false
---

A foundation model is a large AI model trained on broad, diverse data that serves as a starting point for many downstream tasks. GPT-4, Claude, Gemini, and Llama are all foundation models. Rather than training a separate model for each task, you take one foundation model and adapt it through prompting, fine-tuning, or RAG.

**Why the term exists:** The phrase was coined by Stanford's HAI in 2021 to capture a shift in how AI systems are built. Before foundation models, you trained a specific model for each specific task. Now, one model handles translation, summarisation, coding, analysis, and conversation. The economics changed completely.

**Scale matters:** Foundation models are expensive to train, often costing tens of millions of dollars in compute. This concentrates pre-training in a handful of well-funded labs. But the resulting models are general enough that thousands of companies build products on top of them without training their own.

**Open vs closed:** Some foundation models (Llama, Mistral, Qwen) release weights publicly so anyone can run, fine-tune, or modify them. Others (GPT-4, Claude, Gemini) are only available through APIs. This split shapes the entire ecosystem, from pricing to privacy to capability.
