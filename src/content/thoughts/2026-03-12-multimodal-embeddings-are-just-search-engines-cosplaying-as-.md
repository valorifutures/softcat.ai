---
title: "Multimodal embeddings are just search engines cosplaying as intelligence"
date: 2026-03-12
tags: [embeddings, multimodal, retrieval, rag]
summary: "The rush to stuff everything into vector space is solving the wrong problem entirely."
draft: false
pinned: false
---

We're watching the embedding industrial complex rebrand search as reasoning. Every new multimodal embedding model promises to revolutionise how we think about AI, but they're just building increasingly expensive ways to ask "what's similar to this thing?"

## The similarity trap

Vector databases have become the new blockchain. Every startup needs one, every model needs to output embeddings, and every problem looks like a nail when your hammer is cosine similarity. Google's latest Gemini Embedding 2 can handle text, images, video, audio, and documents. Brilliant. But similarity isn't understanding.

When we embed a photo of a cat and a video of a cat purring into the same vector space, we're not teaching the model what cats are. We're teaching it that these things cluster together in some statistical sense. The embedding knows they're related but has no clue why.

## Retrieval isn't reasoning

The entire RAG ecosystem has convinced itself that finding relevant context is the same as thinking about it. We've built elaborate systems that can pull the right documents, match the right images, and surface the right videos. Then we hand this pile of "relevant" content to an LLM and call it reasoning.

This works until it doesn't. When the embedding space fails to capture the relationship you actually need, when the similarity metric optimises for the wrong features, when the retrieval becomes the bottleneck rather than the solution.

We're solving search problems with reasoning budgets and wondering why our agents feel so brittle.
