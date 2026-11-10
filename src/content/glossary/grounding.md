---
title: "Grounding"
description: "Connecting model outputs to real, verifiable information."
tags: [safety, technique, rag]
date: 2026-04-03
related: [retrieval-augmented-generation, hallucination, knowledge-graph]
draft: false
---

Grounding is the practice of tying a model's responses to verifiable sources rather than letting it rely entirely on what it learned during training. A grounded response can point to where its information came from. An ungrounded response is just the model's best guess based on patterns in its training data.

**Why it matters:** Language models are confident by default, even when wrong. Grounding reduces hallucination by giving the model actual source material to draw from. If the model can cite a specific document, database entry, or API response, the user can verify the claim independently.

**How it is done:** The most common approach is RAG, where relevant documents are retrieved and injected into the prompt. Other methods include tool use (calling APIs for live data), knowledge graph lookups, and web search integration. Some systems combine several of these.

**In practice:** Grounding is not a binary switch. A response can be partially grounded (some claims backed by sources, others generated from training). Good implementations make it clear which parts are sourced and which are inferred, often through inline citations or confidence indicators.
