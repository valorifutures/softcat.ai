---
title: "Multi-agent systems are just microservices with extra steps"
date: 2026-02-26
tags: [agents, architecture, microservices, complexity]
summary: "The industry is rebuilding distributed systems patterns with AI agents, complete with the same old coordination nightmares."
draft: false
pinned: false
---

We keep seeing these "hierarchical planner" agents with executors, aggregators, and coordinators. Sound familiar? It should. We're basically rebuilding microservices architecture but with LLMs instead of REST APIs.

## The same distributed headaches

Multi-agent systems have all the classic problems of distributed computing. Agents need to coordinate, pass messages, handle failures, and manage state. The "planner agent talks to executor agent" pattern is just service mesh with extra tokens.

We're even seeing the same solutions emerge. Agent frameworks now include orchestrators, message queues, and circuit breakers. The complexity that killed many microservices projects is creeping back in, dressed up as "agentic workflows."

## When one model would do

Most of these multi-agent setups could be replaced by a single model with better prompting. The hierarchical planning example from the feed? That's just chain-of-thought with more infrastructure overhead.

The real tell is when frameworks need "aggregator agents" to combine outputs from other agents. If you need another AI to make sense of your AI outputs, maybe the problem isn't the model. It's the architecture.

We learned this lesson once with microservices. Start simple, add complexity only when you need it.
