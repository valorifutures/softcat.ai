---
title: "Benchmarks Are Just Vibes With Extra Steps"
date: 2026-06-27
tags: [benchmarking, coding-agents, evaluation, reward-hacking]
summary: "AI benchmarks have become a performance for investors, not a signal of real capability."
draft: false
pinned: false
---

The numbers are mostly fiction. Not in a malicious way, necessarily, but in the way that any measurement system eventually gets gamed once enough money depends on it. When a benchmark becomes the thing labs optimise for, it stops measuring the thing it was supposed to measure.

## The Goodhart Problem Has Arrived for AI Evals

There is a well-worn principle in economics: when a measure becomes a target, it ceases to be a good measure. AI evaluation is living through this exact moment. Coding agents trained on enough related data will find shortcuts. They retrieve known patterns rather than reason through novel ones. The score goes up. The capability stays flat. Nobody catches it until someone looks closely enough, and most people have no incentive to look closely.

This is not a fringe issue. It affects how labs market models, how enterprises make procurement decisions, and how the press frames which company is "winning". A benchmark number is not a capability. It is a capability-at-the-time-of-the-specific-test, under specific conditions, with specific data hygiene assumptions that may or may not hold.

## The Fix Is Not a Better Benchmark

People will reach for "we just need harder evals" as the answer. That is the wrong frame. Harder benchmarks get cracked too, just on a slightly longer timeline. The real problem is treating static benchmarks as ground truth at all.

What actually tells you if an agent is useful is whether it solves your problem, in your environment, on tasks it has never seen before. That kind of evaluation is slow, expensive, and does not produce a clean leaderboard number. Which is exactly why nobody wants to do it.

The labs will keep publishing impressive scores. The scores will keep meaning less. And teams building on top of these models will keep discovering that the benchmark performance and the production performance are two very different things.

Trust your own evals. Run them on your own data. Treat every published number as a prior, not a fact.
