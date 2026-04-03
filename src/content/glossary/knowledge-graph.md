---
title: "Knowledge Graph"
description: "A structured representation of facts as entities and relationships."
tags: [architecture, rag, concept]
date: 2026-04-03
related: [grounding, retrieval-augmented-generation, embeddings]
draft: false
---

A knowledge graph stores information as a network of entities (people, places, concepts) connected by relationships (works at, located in, related to). Unlike a traditional database with rigid tables, a knowledge graph naturally represents how things connect. Google's Knowledge Graph is the most famous example, powering those info boxes you see in search results.

**Why it matters for AI:** Knowledge graphs give models structured, factual data to reason over. Instead of relying on fuzzy pattern matching from training data, a model can query a knowledge graph for specific facts and relationships. This is a powerful grounding technique that complements RAG.

**How it works with LLMs:** A common pattern is to let the model generate a structured query (like SPARQL or Cypher) against a knowledge graph, then use the results to inform its response. Some systems also use LLMs to build and maintain knowledge graphs automatically by extracting entities and relationships from unstructured text.

**Trade-offs:** Knowledge graphs are excellent for structured, factual queries but require significant effort to build and maintain. They work best when the domain is well-defined and the relationships between entities are important. For broad, open-ended questions, vector search (RAG) is often simpler to set up.
