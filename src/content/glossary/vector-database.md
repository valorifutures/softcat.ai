---
title: "Vector Database"
description: "A database optimised for storing and searching embedding vectors using approximate nearest-neighbour algorithms."
tags: [architecture, retrieval, infrastructure, vectors]
date: 2026-04-03
related: [embeddings, retrieval-augmented-generation]
draft: false
---

A vector database stores embedding vectors and lets you search them by similarity rather than exact match. Given a query vector, it returns the N closest vectors (and their associated documents) from the index. This is the backbone of semantic search and RAG retrieval.

**Why it matters:** Standard databases (SQL, document stores) index text with keyword search. Vector databases index meaning. You can search for "running shoes for overpronation" and retrieve a document that says "motion-control trainers for flat feet" — because the embeddings are close even though the words differ.

**How they work:** Most use Approximate Nearest Neighbour (ANN) algorithms like HNSW or IVF to find close vectors quickly without exhaustively comparing every row. The tradeoff is slight accuracy loss for a large speed gain.

**Common options:**
- **Managed**: Pinecone, Weaviate Cloud, Qdrant Cloud, Zilliz
- **Self-hosted**: Chroma, Milvus, Qdrant, Weaviate
- **Postgres extensions**: pgvector (good enough for most projects under 1M vectors)

**Watch out for:** You usually don't need a dedicated vector database to start. pgvector on an existing Postgres instance handles millions of vectors fine. Reach for a specialist system when query latency at scale becomes a real problem.
