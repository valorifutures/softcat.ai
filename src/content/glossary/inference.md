---
title: "Inference"
description: "Running a trained model to generate outputs."
tags: [infrastructure, performance, concept]
date: 2026-04-03
related: [latency, sampling, quantization]
draft: false
---

Inference is the process of using a trained model to produce outputs from new inputs. When you send a prompt to Claude or GPT and get a response back, that is inference. It is distinct from training, which is when the model learns from data. Most of the cost and engineering effort in production AI systems goes into making inference fast, cheap, and reliable.

**Why it matters:** Training happens once (or occasionally). Inference happens millions of times a day. The speed and cost of inference determine whether a product is viable. A model that takes 30 seconds to respond or costs a dollar per query is useless for most real-time applications.

**How it is optimised:** Common techniques include quantization (reducing numerical precision), batching (processing multiple requests together), KV-cache reuse (avoiding redundant computation for shared prompt prefixes), and speculative decoding (using a small model to draft tokens that a large model verifies). Hardware matters too, with GPUs, TPUs, and custom silicon all competing on inference throughput.

**Managed vs self-hosted:** You can run inference through an API (OpenAI, Anthropic, Google) or host models yourself using frameworks like vLLM, TGI, or Ollama. APIs are simpler but cost more at scale. Self-hosting gives you control but requires GPU infrastructure and operational expertise.
