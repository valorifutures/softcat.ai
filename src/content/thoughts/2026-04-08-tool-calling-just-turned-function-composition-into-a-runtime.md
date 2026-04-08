---
title: "Tool calling just turned function composition into a runtime circus"
date: 2026-04-08
tags: [tool-calling, api-design, function-composition, runtime]
summary: "Multi-step tool chains are brilliant engineering wrapped in terrible abstractions that make simple function calls look like distributed systems."
draft: false
pinned: false
---

Combining Google Search, Maps, and custom functions in a single API call sounds impressive until you realise we've just reinvented function composition with extra steps and network overhead. Tool calling frameworks are turning what should be clean, predictable code into runtime guessing games where your assistant might decide to call seventeen functions to book a restaurant.

## The abstraction leak is the feature

Multi-step agentic chains with "context circulation" are just function pipelines that forgot how to fail gracefully. When your API call needs to manage parallel tool IDs and coordinate between search results and map data, you're not building intelligence. You're building a distributed system that pretends to be a single function call.

The real problem isn't the complexity. It's that we're optimising for the wrong thing. Instead of making tools work together predictably, we're making them work together dynamically. That's the difference between engineering and magic.

## Runtime composition beats design-time composition

But here's why it matters anyway. Function composition at design time assumes you know what functions you need. Tool calling at runtime assumes you'll figure it out as you go. For most real-world problems, the second approach actually works better.

When you're building systems that need to adapt to user intent rather than developer intent, runtime composition starts looking less like overengineering and more like the only sensible approach. We just need to stop pretending it's simple.
