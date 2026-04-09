---
title: "Multi-agent frameworks are just microservices with hallucination problems"
date: 2026-04-09
tags: [multi-agent, frameworks, microservices, orchestration]
summary: "The agent orchestration craze is just distributed systems architecture wearing an AI costume."
draft: false
pinned: false
---

We've seen this film before. Split your monolith into smaller services, add a message queue, call it "scalable architecture". Now we're doing the exact same thing with AI agents and pretending it's revolutionary.

## Orchestration theatre

Every multi-agent framework promises the same fantasy. Specialist agents working in harmony, each handling their domain expertise, coordinated by some brilliant orchestrator. It's microservices all over again, complete with the same problems nobody wants to talk about.

Network calls between agents. Serialisation overhead. Partial failures. State synchronisation nightmares. The orchestrator becomes a single point of failure, just like your API gateway did five years ago.

## The coordination tax

Here's what actually happens in production. Your "research agent" calls your "analysis agent" which calls your "formatting agent". Three LLM calls where one would do. Three opportunities for hallucination. Three places where context gets lost in translation.

The coordination overhead isn't just computational. It's cognitive. Each handoff between agents is a game of telephone played with probability distributions. Your clean separation of concerns becomes a mess of prompt engineering and error handling.

## Single models are winning

Meanwhile, the models themselves keep getting better at multi-step reasoning. GLM-5.1 can sustain eight-hour autonomous execution in a single session. Why are we building elaborate agent orchestration when the models are learning to orchestrate themselves?

The future isn't agent swarms. It's capable models that can hold context, switch between tasks, and reason through complex workflows without needing a distributed systems PhD to deploy them.
