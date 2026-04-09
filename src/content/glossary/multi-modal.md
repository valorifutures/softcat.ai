---
title: "Multi-Modal"
description: "A model that handles more than one type of input or output, like text plus images."
tags: [models, architecture, concept]
date: 2026-04-03
related: [foundation-model, llm, embeddings]
draft: false
---

A multi-modal model can process and generate more than one type of data. The most common combination is text and images, but newer models also handle audio, video, and code execution. GPT-4o, Gemini, and Claude all accept both text and image inputs.

**Why it matters:** The real world is not text-only. Being able to show a model a screenshot, a diagram, or a photo and ask questions about it opens up use cases that pure language models cannot touch. Think document understanding, visual QA, UI testing, medical imaging analysis, and accessibility tools.

**How it works:** Multi-modal models typically use separate encoders for each modality (a vision transformer for images, a standard transformer for text) that project everything into a shared representation space. The model then reasons over these unified representations. Some models can also generate images or audio, not just understand them.

**Current state:** Text-and-image understanding is mature and widely available. Audio input and output is becoming standard (GPT-4o, Gemini). Video understanding is improving rapidly but still limited to short clips in most models. The trajectory is toward models that can handle any input type natively.
