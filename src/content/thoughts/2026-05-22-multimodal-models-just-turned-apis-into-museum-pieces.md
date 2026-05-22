---
title: "Multimodal models just turned APIs into museum pieces"
date: 2026-05-22
tags: [multimodal, apis, architecture]
summary: "Single models handling text, vision, and audio are making our carefully crafted API boundaries look like relics from the stone age."
draft: false
pinned: false
---

We spent years building elaborate API orchestrations to handle different modalities. Text to this service, images to that one, audio somewhere else entirely. Now models like Lance are doing all three in one go with 3B parameters, and our beautiful microservices architecture looks like a Rube Goldberg machine.

## The great API collapse

Traditional multimodal workflows required three API calls minimum. Send text to Claude, images to Midjourney, audio to Whisper. Each with different rate limits, pricing models, and failure modes. Each needing separate error handling, retry logic, and monitoring. We built entire platforms around stitching these pieces together.

Models that natively understand all modalities don't just reduce complexity. They eliminate entire categories of problems. No more format conversion between services. No more synchronising responses from different providers. No more debugging which API in the chain broke your workflow.

## Why this changes everything

Single multimodal models turn integration problems into prompt engineering problems. Instead of managing multiple service contracts, you're crafting better instructions. Instead of handling API timeouts across three services, you're dealing with one model that might just work better because it sees the full context.

The companies building API orchestration layers are about to discover what video rental shops felt like in 2007. The infrastructure we thought was essential is becoming middleware nobody needs.
