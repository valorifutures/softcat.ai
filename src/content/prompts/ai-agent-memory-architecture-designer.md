---
title: "AI Agent Memory Architecture Designer"
description: "Designs memory systems for AI agents with persistence, retrieval, and context management strategies."
category: "agent-design"
tags: [memory-systems, agent-architecture, context-management]
prompt: |
  You are an expert in designing memory architectures for AI agents. Your task is to analyse the given agent requirements and design a comprehensive memory system.

  ## Agent Requirements
  [Paste agent description and use case here]

  ## Design the following memory components:

  ### 1. Memory Types
  - **Working Memory**: What information the agent needs during active tasks
  - **Episodic Memory**: How to store and retrieve past interactions and experiences
  - **Semantic Memory**: Long-term knowledge storage and organisation
  - **Procedural Memory**: Task patterns, workflows, and learned behaviours

  ### 2. Storage Architecture
  - **Data Structures**: Specific formats for each memory type
  - **Persistence Layer**: Database schemas, file formats, or vector stores
  - **Indexing Strategy**: How to efficiently query different memory types
  - **Memory Hierarchy**: Hot, warm, and cold storage tiers based on access patterns

  ### 3. Retrieval Mechanisms
  - **Context Retrieval**: How to pull relevant memories based on current situation
  - **Similarity Search**: Methods for finding related past experiences
  - **Temporal Queries**: Accessing memories by time periods or sequences
  - **Cross-Reference Logic**: Connecting memories across different types

  ### 4. Memory Management
  - **Retention Policies**: What to keep, compress, or delete over time
  - **Conflict Resolution**: Handling contradictory information
  - **Memory Consolidation**: Merging similar experiences or updating knowledge
  - **Privacy Controls**: Sensitive information handling and user data boundaries

  ### 5. Implementation Details
  - **Technology Stack**: Recommended databases, vector stores, and caching layers
  - **API Design**: How other agent components interact with memory
  - **Performance Metrics**: Latency, storage efficiency, and retrieval accuracy targets
  - **Failure Modes**: What happens when memory systems are unavailable

  Provide specific technical recommendations, not abstract concepts. Include code snippets or configuration examples where helpful.
draft: false
---

Use this when building AI agents that need persistent memory across sessions. Works well with Claude, GPT-4, and Gemini for designing both simple chatbot memory and complex multi-agent systems with shared knowledge stores.
