---
title: "Embeddings"
description: "A way of representing text as numbers so a computer can work with meaning, not just characters."
tags: [vectors, concept, technique]
date: 2026-04-03
related: [vector-database, retrieval-augmented-generation, tokenisation]
draft: false
---

An embedding is a list of numbers (a vector) that captures the meaning of a piece of text. Similar texts end up with similar vectors, so "how do I reset my password" and "I forgot my login" will be close together in the vector space even though they share no words. This lets you search by meaning rather than by keyword.

**How they are created:** You pass text through a specialised model (like OpenAI's text-embedding-3 or an open-source alternative like E5) and get back a fixed-length vector, typically 768 to 3072 dimensions. The model has been trained so that semantically similar inputs produce similar vectors.

**Where they are used:** Embeddings power semantic search, RAG pipelines, recommendation systems, clustering, and duplicate detection. Any task where you need to compare the meaning of two pieces of text benefits from embeddings.

**Things to know:** The embedding model matters a lot. Different models capture different nuances, and an embedding trained for English may not work well for other languages. You also cannot mix embeddings from different models, since they live in different vector spaces.
