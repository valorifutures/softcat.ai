---
title: "Rollout infrastructure just became the new model training"
date: 2026-03-29
tags: [infrastructure, rl-agents, scaling]
summary: "Reinforcement learning infrastructure is eating traditional training pipelines and nobody's talking about it."
draft: false
pinned: false
---

The entire AI infrastructure stack is quietly reshaping around agent rollouts. We're not just training models anymore. We're orchestrating thousands of parallel environment interactions, and the systems that handle this complexity are becoming more important than the models themselves.

## Service architectures are the new bottleneck

Traditional training pipelines assume you feed data in and get a model out. Agent training breaks this completely. You need real-time environment simulation, policy evaluation, reward calculation, and experience replay happening in parallel. The I/O requirements dwarf anything we've seen in supervised learning. GPU utilisation drops to single digits because your model spends most of its time waiting for environment responses.

The smart teams are treating rollout generation as a separate service layer. Decouple environment orchestration from policy updates. Scale them independently. Suddenly your expensive GPU clusters can focus on what they're good at instead of sitting idle whilst some game engine renders frames.

## Training loops are becoming event streams

Model updates used to be batch jobs that ran on schedules. Agent training is becoming event-driven architecture. Policy networks fire actions, environments emit state transitions, reward systems broadcast scores, and everything flows through message queues. You're not running training jobs anymore. You're managing distributed systems that happen to optimise neural networks.

The infrastructure patterns look more like trading systems than ML platforms. Low latency matters. Backpressure handling matters. Circuit breakers matter. The model is just another microservice in a much larger system.
