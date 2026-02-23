---
title: "Context windows matter more than benchmarks"
date: 2026-02-14
tags: [context-window, models, opinion]
summary: "A model that can hold your entire project in context beats a slightly smarter model that can't."
draft: false
---

Everyone argues about benchmark scores. Which model is 2% better on MMLU. Which one tops the coding leaderboard this week. Most of that is noise.

The thing that actually changes how you work is context window size. A model with 200k context that can hold your entire codebase in memory is more useful than a marginally smarter model that forgets what you said 10 messages ago.

## Real world example

We gave Claude our whole project. Every file, every config, every test. It could answer questions about how things connected, suggest changes that were consistent with the existing patterns, and catch bugs that spanned multiple files. Try that with a 4k context window.

## The next frontier

The models that win won't just be smarter. They'll be the ones that can hold an entire workday in context. Your morning conversation, the code you wrote, the emails you read, the meeting notes. Persistent, long-running context is the unlock nobody talks about enough.

Benchmarks measure intelligence. Context windows measure usefulness. We know which one we care about more.
