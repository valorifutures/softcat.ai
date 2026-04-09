---
title: "Hallucination"
description: "When a model generates confident-sounding text that is factually wrong."
tags: [safety, concept, models]
date: 2026-04-03
related: [grounding, retrieval-augmented-generation, benchmark]
draft: false
---

Hallucination is when a language model produces text that sounds plausible but is factually incorrect. It might invent citations that do not exist, attribute quotes to the wrong person, or state made-up statistics with total confidence. The model is not lying. It is doing what it was trained to do: produce likely-sounding text.

**Why it happens:** LLMs predict the next token based on patterns, not facts. They have no internal fact-checker. If the training data contained conflicting information or if the question is about something rare, the model fills in the gaps with whatever pattern fits best. The result looks authoritative but may be completely fabricated.

**How to reduce it:** Grounding (RAG, tool use, web search) gives the model real data to reference instead of guessing. Lower temperature settings reduce randomness. Chain-of-thought prompting can help the model catch its own errors. Some systems add a verification step where a second model checks the first model's claims.

**The hard truth:** Hallucination cannot be fully eliminated with current architectures. It is a fundamental property of how these models work. The best approach is to design systems that assume the model might be wrong and build verification into the workflow.
