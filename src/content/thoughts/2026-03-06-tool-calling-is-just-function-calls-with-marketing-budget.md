---
title: "Tool calling is just function calls with marketing budget"
date: 2026-03-06
tags: [tool-calling, agents, apis, frameworks]
summary: "The AI industry has wrapped basic function calls in fancy terminology and called it innovation."
draft: false
pinned: false
---

Every AI framework now ships with "tool calling" as if it's some breakthrough in computer science. It's not. We've taken function calls, added JSON schemas, and convinced ourselves we've invented something new.

## Same dance, different music

Look at any "agentic" system today. An LLM generates a JSON blob that maps to a function signature. Your code parses it, runs the function, and feeds the result back. This is identical to what we've been doing with APIs for decades, just with a language model as the router instead of HTTP endpoints.

The Model Context Protocol, CLI tools for Workspace APIs, and agent frameworks all follow the same pattern. Define your functions, expose them through a schema, let the model pick which one to call. We've added latency, non-determinism, and token costs to achieve what we used to do with direct function calls.

## The wrapper economy strikes again

The real innovation isn't in the calling mechanism. It's in having models that can reliably map natural language intent to structured function calls. But instead of focusing on that capability, we've built entire industries around wrapping basic programming concepts in AI terminology.

Your "agent" is a fancy dispatcher. Your "tools" are functions. Your "orchestration framework" is a task queue with extra steps. The sooner we admit this, the sooner we can focus on actually improving the underlying reasoning instead of polishing the pipes.
