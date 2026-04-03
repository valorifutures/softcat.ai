---
title: "Embeddings"
description: "Numerical representations of text (or images, audio, etc.) that capture semantic meaning as a point in high-dimensional space."
tags: [architecture, retrieval, vectors, semantic-search]
date: 2026-04-03
related: [retrieval-augmented-generation, vector-database, context-window]
draft: false
---

An embedding converts a piece of text into a fixed-length array of numbers (a vector). The magic is that semantically similar texts produce vectors that are close together in that high-dimensional space. "dog" and "puppy" end up near each other. "dog" and "invoice" end up far apart.

**Why it matters:** Embeddings let computers compare meaning rather than just string-match keywords. This underpins semantic search, recommendation systems, and the retrieval step in RAG pipelines.

**How they're created:** A dedicated embedding model (not a chat model) reads the text and outputs the vector. Common choices are OpenAI's `text-embedding-3-small`, Cohere's Embed v3, and open-source models like `bge-m3`. The vector dimension is typically 768–3072 numbers.

**In practice:**
- Embed your documents at index time → store vectors in a vector database
- Embed the user's query at search time → find the nearest document vectors
- Return the closest documents as context

**Watch out for:** Embedding models have their own token limits (usually 512–8192 tokens). Content longer than the limit gets truncated, which degrades retrieval quality for long documents.
