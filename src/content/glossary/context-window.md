---
title: "Context Window"
description: "The maximum amount of text a model can hold in its working memory at once."
tags: [architecture, models, concept]
date: 2026-04-03
related: [tokenisation, attention-mechanism, retrieval-augmented-generation]
draft: false
---

The context window is the total number of tokens a model can process in a single request, covering both the input (your prompt, system instructions, any documents) and the output (the model's response). If your content exceeds the window, the model simply cannot see the overflow.

**Sizes vary hugely:** GPT-3 launched with a 4K token window. By 2026, Claude offers up to 1M tokens and Gemini supports even larger contexts. Bigger windows let you feed entire codebases, long documents, or extended conversation histories without truncation.

**Why it matters:** Context window size determines what you can do in a single pass. A small window forces you to chunk documents and use retrieval (RAG) to find relevant pieces. A large window lets you skip that complexity and just paste everything in. But bigger windows cost more and can be slower.

**Practical note:** Having a large context window does not mean the model pays equal attention to all of it. Research shows models can struggle with information buried in the middle of very long contexts, sometimes called the "lost in the middle" effect. For critical information, placement matters.
