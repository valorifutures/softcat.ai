---
title: "Latency"
description: "How long it takes from sending a prompt to receiving the first token."
tags: [performance, infrastructure, concept]
date: 2026-04-03
related: [inference, sampling, quantization]
draft: false
---

Latency in AI usually refers to time-to-first-token (TTFT): how many milliseconds pass between sending a request and getting the first token of the response back. There is also end-to-end latency, which covers the full time until the response is complete. Both matter, but TTFT determines how snappy the experience feels.

**What affects it:** Model size is the biggest factor. Larger models take longer to process each token. Prompt length matters too, since the model must process all input tokens before generating the first output token. Network round-trip time, server load, and whether your request hits a cold or warm instance all add up.

**Why it matters:** For interactive applications (chatbots, coding assistants, real-time agents), high latency kills the user experience. For batch processing (document analysis, data extraction), throughput matters more than latency. The right trade-off depends on the use case.

**How to reduce it:** Smaller models, quantization, prompt caching, geographic routing (serving from a closer data centre), and streaming (sending tokens as they are generated rather than waiting for the full response). Some providers offer latency-optimised tiers at a higher price.
