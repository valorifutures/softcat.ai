---
title: "Cross-datacenter inference just split the monolith that never should have been one"
date: 2026-04-20
tags: [distributed-inference, infrastructure, latency, serving]
summary: "Breaking prefill and decode across datacenters isn't innovation, it's just fixing a fundamental architectural mistake."
draft: false
pinned: false
---

We've been serving LLMs wrong from day one. The entire industry built inference like it was 2015, cramming prefill and decode into the same rack because that's what the networking allowed. Now researchers are finally admitting what should have been obvious: these are completely different workloads that belong in completely different places.

## The bandwidth lie

RDMA networks kept us trapped in single-datacenter thinking. High bandwidth between machines in the same facility made it seem natural to co-locate everything. But prefill is a batch-friendly, GPU-hungry burst operation. Decode is latency-sensitive, memory-bound, and wants to live close to users. Keeping them together was always a compromise, not a feature.

## Geography beats gigabytes

Cross-datacenter KV cache sharing isn't just about better resource utilisation. It's about putting compute where it actually makes sense. Prefill can happen wherever GPUs are cheapest and power is abundant. Decode can happen at the edge, close to the humans waiting for tokens. The networking technology finally caught up to what the workload distribution should have been all along.

The real revelation isn't that we can split inference across datacenters. It's that we spent years pretending proximity mattered more than physics.
