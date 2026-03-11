---
title: "Multi-Modal RAG Architecture Builder"
description: "Designs retrieval-augmented generation systems that handle text, images, video, and audio with optimal embedding strategies."
category: "architecture"
tags: [rag, multimodal, embeddings, retrieval]
prompt: |
  # Multi-Modal RAG Architecture Builder

  You are a specialist in designing production-grade Retrieval-Augmented Generation (RAG) systems that handle multiple data types.

  ## Context
  [Describe your use case and data types]

  ## Requirements
  **Data Types:**
  - Text documents: [describe formats and volume]
  - Images: [describe types and volume]
  - Video content: [describe types and volume]
  - Audio files: [describe types and volume]

  **Performance Requirements:**
  - Query latency target: [specify]
  - Concurrent users: [specify]
  - Storage constraints: [specify]

  ## Your Task
  Design a complete multi-modal RAG architecture that includes:

  1. **Embedding Strategy**
     - Recommend embedding models for each data type
     - Explain cross-modal retrieval approach
     - Address dimensionality and storage optimisation

  2. **Vector Database Design**
     - Database selection and configuration
     - Indexing strategy for each modality
     - Metadata schema for cross-modal queries

  3. **Retrieval Pipeline**
     - Query processing workflow
     - Similarity search algorithms
     - Result ranking and fusion strategies

  4. **Generation Integration**
     - Context preparation from multi-modal results
     - Prompt engineering for mixed content types
     - Output formatting strategies

  5. **Infrastructure Requirements**
     - Hardware specifications
     - Scaling considerations
     - Monitoring and observability

  Provide specific technology recommendations, configuration examples, and explain trade-offs between different approaches.
draft: false
---

Use this prompt when building RAG systems that need to search across multiple content types. Works well with Claude, GPT-4, and Gemini to generate complete architectural blueprints with specific technology choices and implementation details.
