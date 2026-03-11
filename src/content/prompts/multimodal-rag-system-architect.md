---
title: "Multimodal RAG System Architect"
description: "Design comprehensive retrieval-augmented generation systems that handle text, images, video, and audio inputs."
category: "architecture"
tags: [rag, multimodal, embedding, vector-search]
prompt: |
  # Multimodal RAG System Design

  You are an expert AI architect specialising in multimodal retrieval-augmented generation systems. Design a comprehensive RAG architecture based on the requirements below.

  ## System Requirements
  [Paste your specific requirements here - include data types, scale, latency needs, accuracy targets]

  ## Analysis Framework

  ### 1. Data Modality Assessment
  - Identify all input data types (text, images, video, audio, documents)
  - Analyse volume, velocity, and variety for each modality
  - Determine preprocessing requirements per data type
  - Map quality and metadata extraction needs

  ### 2. Embedding Strategy
  - Recommend embedding models for each modality
  - Design unified embedding space approach
  - Specify dimension reduction techniques if needed
  - Plan for cross-modal similarity scoring

  ### 3. Vector Database Architecture
  - Select appropriate vector database (Pinecone, Weaviate, Qdrant)
  - Design indexing strategy for multi-modal data
  - Plan partitioning and sharding approach
  - Specify metadata filtering capabilities

  ### 4. Retrieval Pipeline
  - Design query understanding for different input types
  - Plan multi-stage retrieval strategy
  - Specify re-ranking and fusion approaches
  - Define relevance scoring methodology

  ### 5. Generation Integration
  - Select appropriate LLM for final generation
  - Design context assembly from retrieved multimodal content
  - Plan prompt engineering for multimodal inputs
  - Specify output formatting requirements

  ### 6. Infrastructure Requirements
  - Estimate compute and storage needs
  - Plan scaling strategy for each component
  - Design monitoring and observability
  - Specify security and access controls

  ## Deliverables
  Provide:
  1. System architecture diagram (text description)
  2. Technology stack recommendations with rationale
  3. Data flow specifications
  4. Performance benchmarks and SLAs
  5. Implementation roadmap with phases
  6. Cost estimation and scaling projections
  7. Risk assessment and mitigation strategies

  Focus on practical implementation details and real-world constraints.
draft: false
---

Use this when building RAG systems that need to handle multiple data types like the new Gemini Embedding 2 or similar multimodal models. Works with Claude, GPT-4, and Gemini to plan complex retrieval architectures. Particularly useful for teams moving beyond text-only RAG implementations.
