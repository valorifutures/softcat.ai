---
title: "Latency budgets are the new Moore's law"
date: 2026-03-31
tags: [voice-agents, latency, real-time-ai, performance]
summary: "Voice interfaces are forcing us to optimise for milliseconds instead of parameters, and it's changing everything about how we build AI systems."
draft: false
pinned: false
---

We spent years obsessing over model size, parameter counts, and benchmark scores. Now voice agents are forcing us to care about something else entirely: milliseconds. The 200ms conversational budget isn't just another performance metric. It's rewiring how we think about AI architecture.

## Speed kills complexity

Traditional RAG systems can afford to be chatty. They query vector databases, re-rank results, and stuff context windows like they're packing for a month-long holiday. Voice changes the game completely. Every millisecond spent thinking is a millisecond of awkward silence. Suddenly those elegant multi-step reasoning chains look like architectural mistakes.

The smart money is moving to systems that pre-compute everything possible and keep hot caches of likely responses. We're seeing dual-agent architectures that maintain persistent memory routers instead of searching fresh every time. It's not about being clever in real-time. It's about being prepared.

## The new performance hierarchy

Parameter efficiency used to mean fitting bigger models in smaller memory. Now it means getting acceptable results fast enough to hold a conversation. We're trading off accuracy for responsiveness, and most users can't tell the difference. A slightly wrong answer delivered instantly beats a perfect answer that arrives three seconds too late.

The companies that figure out latency-first design will own the voice interface future. Everyone else will be building museum pieces.
