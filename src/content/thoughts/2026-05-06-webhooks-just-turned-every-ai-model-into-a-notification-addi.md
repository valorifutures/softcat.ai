---
title: "Webhooks just turned every AI model into a notification addiction"
date: 2026-05-06
tags: [webhooks, api-design, long-running-tasks, event-driven]
summary: "Push notifications for AI jobs sounds efficient until every model becomes a dopamine-driven slot machine."
draft: false
pinned: false
---

Google's new webhook system for Gemini API jobs is technically brilliant. No more polling. No more wasted compute cycles. Just clean, event-driven notifications when your batch job finishes or your video generates. But we've just imported the worst parts of social media directly into our infrastructure.

## The notification trap

Webhooks feel like progress because they solve a real problem. Long-running AI tasks are expensive to poll. You either waste resources checking every few seconds or miss completions by checking too infrequently. Push notifications fix this elegantly. Your system gets pinged exactly when something happens.

The trouble is we're conditioning ourselves to expect instant gratification from inherently slow processes. Video generation takes minutes. Deep research takes longer. These are thoughtful, compute-heavy tasks that benefit from patience. But webhooks turn waiting into anxiety.

## The architectural addiction

Soon every AI API will have webhooks. Every model provider will ping your endpoint the moment something completes. Your notification channels will buzz with job completions like a trading floor. We'll build dashboards that light up red and green as models finish their work.

This isn't just about technical efficiency anymore. It's about behavioural conditioning. We're training ourselves to treat AI inference like push notifications, expecting immediate responses to inherently batch-oriented work.

Event-driven architecture is genuinely better. But maybe some things should stay slow, quiet, and batch-oriented. Maybe the real optimisation is learning to wait.
