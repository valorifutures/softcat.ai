---
title: "Context Window"
description: "The maximum amount of text (measured in tokens) a language model can read and reason over in a single request."
tags: [llm, architecture, tokens, limits]
date: 2026-04-03
related: [retrieval-augmented-generation, embeddings]
draft: false
---

Every language model has a fixed context window — the total number of tokens it can process at once, combining both input and output. If your prompt plus the expected response exceeds this limit, the model can't proceed or will truncate.

**Why it matters:** The context window is the model's working memory. Larger windows let you send longer documents, more conversation history, or richer examples. Smaller windows force you to summarise, chunk, or retrieve selectively.

**How tokens map to text:**
- 1 token ≈ 0.75 words in English
- 100,000 tokens ≈ 75,000 words (a novel-length document)
- Most API calls for real tasks land between 1k and 20k tokens

**Common sizes (as of 2026):** Models range from 8k tokens (older GPT-3.5) up to 1–2 million tokens (Gemini 1.5 Pro, some Claude versions). The gap between models is narrowing fast.

**Watch out for:** A long context window doesn't mean the model attends equally to everything in it. "Lost in the middle" is a known pattern — models often under-attend to content buried in the middle of a long prompt. Critical information belongs near the start or end.
