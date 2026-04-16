---
title: "Memory systems are just databases with identity crises"
date: 2026-04-16
tags: [memory-systems, agents, databases, infrastructure]
summary: "AI memory layers are reinventing database concepts with worse performance and marketing speak that would make Oracle blush."
draft: false
pinned: false
---

We're watching the AI industry rediscover databases whilst pretending they've invented something revolutionary. Every "universal long-term memory layer" tutorial reads like a freshman database course wrapped in vector embedding buzzwords. The result is worse performance, higher costs, and engineers who think they're building AGI when they're actually just implementing a really expensive key-value store.

## Semantic retrieval is just indexing with extra steps

ChromaDB, Mem0, and their cousins are selling the same basic premise: store stuff, find stuff later. The "semantic" bit just means we're using embeddings instead of B-trees. That's fine, but let's not pretend we've transcended relational algebra. We're still doing joins, we're still worried about consistency, and we're still debugging query performance at 3am. The only difference is now the queries are in natural language and the debugging tools are rubbish.

## User-scoped persistence solves yesterday's problems

The obsession with "user-scoped memories" reveals how little we understand what these agents actually need to remember. Real applications don't need perfect recall of every conversation. They need selective forgetting, context prioritisation, and graceful degradation when memory gets stale. Traditional databases already solved these problems with TTLs, partitioning, and caching strategies. We're rebuilding all of this from scratch because we convinced ourselves that vectors make everything different.

The irony is delicious: we're building memory systems that remember everything and forget how databases work.
