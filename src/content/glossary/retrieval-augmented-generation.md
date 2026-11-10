---
title: "Retrieval-Augmented Generation (RAG)"
description: "A technique that grounds LLM responses in external data by retrieving relevant documents before generating a reply."
tags: [architecture, retrieval, llm, grounding]
date: 2026-04-03
related: [context-window, embeddings, vector-database]
draft: false
---

RAG combines a retrieval step with a generation step. Before the model writes its response, a search system finds relevant documents from a knowledge base (usually via vector similarity) and injects them into the prompt as context.

**Why it matters:** LLMs only know what was in their training data. RAG lets you point them at your own documents, databases, or APIs without fine-tuning. The model generates answers grounded in your data rather than guessing from its training set.

**How it works in practice:**
- User asks a question
- An embedding model converts the question to a vector
- A vector database finds the most similar document chunks
- Those chunks get added to the prompt as context
- The LLM generates a response using that context

**Common stack:** OpenAI embeddings or a local model, Pinecone/Weaviate/pgvector for storage, LangChain or LlamaIndex for orchestration.

**Watch out for:** Retrieval quality matters more than model quality. If you retrieve the wrong chunks, the model will confidently answer from irrelevant context. Chunk size, overlap, and embedding model choice all affect results significantly.
