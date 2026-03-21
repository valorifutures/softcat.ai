---
title: "Agent swarms are just distributed systems with commitment issues"
date: 2026-03-21
tags: [multi-agent, orchestration, distributed-systems, architecture]
summary: "Multi-agent frameworks promise intelligent coordination but deliver the same old distributed computing problems with fancy names."
draft: false
pinned: false
---

Agent swarms sound revolutionary until you realise they're just microservices that can't make up their minds. Every "breakthrough" in multi-agent orchestration is solving problems we sorted decades ago in distributed systems, except now we're doing it with chatbots instead of proper interfaces.

## Task decomposition is just job queues with extra steps

ClawTeam's leader-worker architecture isn't novel. It's a bog-standard message broker pattern dressed up with OpenAI function calls. The "leader agent" decomposes tasks whilst "worker agents" execute them autonomously. Replace "agent" with "service" and you've got every enterprise architecture from 2015.

The only difference is latency. Traditional job queues fail fast and retry predictably. Agent swarms fail slow and retry creatively, which sounds clever until you're debugging why your invoice processing agent decided to write poetry instead.

## Dependency resolution doesn't magically improve with reasoning

Shared task boards with automatic dependency resolution exist in every CI/CD pipeline. But when agents do it, we act like it's artificial general intelligence. The fundamental problems remain the same: deadlocks, race conditions, and cascading failures.

Agents can't reason their way out of distributed systems problems any more than microservices could. They just make the failure modes more interesting to debug. At least when a REST endpoint crashes, it doesn't leave a chat log explaining its existential crisis.

We're rebuilding distributed computing with the reliability of a Slack bot and calling it progress.
