---
title: "Speculative Decoding Just Made Inference Speed a Red Herring"
date: 2026-06-26
tags: [inference, speculative-decoding, hardware, model-efficiency]
summary: "Everyone is racing to make tokens generate faster, but speed is no longer the bottleneck worth solving."
draft: false
pinned: false
---

We are getting very good at a problem that matters less than we think. Block-level speculative decoding, KV cache flattening, parallel draft passes, throughput numbers that sound like they belong in a GPU press release. The inference stack is genuinely impressive right now. But optimising for raw token speed is starting to feel like polishing the engine on a car stuck in traffic.

## The Real Bottleneck Moved Upstream

Faster generation does not help much when the constraint is decision quality, not output volume. Agents that draft whole token blocks in a single pass still need to make good choices about what to do next. A model that produces a wrong plan at 15x throughput is just wrong faster. The latency problem worth solving right now is not tokens per second, it is the time between a task starting and a correct result landing.

## Hardware Wins Are Hiding the Architecture Problem

The throughput gains we are seeing are real, but a lot of them are tied to specific silicon. Numbers that look transformational on Blackwell do not travel cleanly to the rest of the stack. When a speedup is fundamentally a hardware marketing story dressed up as a research result, it shifts the actual problem onto whoever cannot afford the new kit. Meanwhile, the harder work, getting agents to plan well, retry gracefully, and stop when they should, is moving slower than the benchmark leaderboard suggests.

## What Actually Needs to Be Fast

The things worth speeding up are not generation loops. They are tool calls, memory reads, context compaction, and coordination between agents. Those are the places where real latency accumulates in production. A pipeline that routes, fetches, decides, and delegates well will beat a fast generator every time. We should be benchmarking decision throughput, not token throughput.

Speed is a feature. It stopped being the feature a while ago.
