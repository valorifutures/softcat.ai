---
title: "TencentDB Agent Memory"
date: 2026-05-24
description: "A fully local memory system for AI agents with a clever 4-tier hierarchy and symbolic short-term storage."
url: "https://www.marktechpost.com/2026/05/23/tencent-open-sources-tencentdb-agent-memory-a-4-tier-local-memory-pipeline-for-ai-agents/"
status: experimental
tags: [agent-memory, local-deployment, open-source, sqlite]
draft: false
---

Tencent just open-sourced something we've been waiting for. A proper memory system for AI agents that runs entirely locally.

The clever bit is how they handle short-term memory. Instead of storing verbose tool logs, it creates a compact Mermaid task canvas. Clean, readable, efficient.

The long-term memory uses a 4-tier pyramid structure. Conversation flows up to Atom, then Scenario, then Persona. Each level gets more abstract and permanent. It's like how human memory works, but systematic.

Ships as an OpenClaw plugin or Hermes Docker image. Runs on SQLite with sqlite-vec for the vector bits. Uses hybrid BM25 plus vector search with RRF fusion for retrieval. All the pieces fit together nicely.

We're seeing more teams realise that agents without memory are just expensive chatbots. This gives you persistent memory without sending everything to external services. MIT licensed too, so you can actually use it.
