---
title: "Confidence scores are just anxiety for algorithms"
date: 2026-03-22
tags: [uncertainty-estimation, production, deployment]
summary: "Teaching models to second-guess themselves won't save us from production disasters."
draft: false
pinned: false
---

We're building uncertainty-aware systems because we can't admit the real problem. Models that report confidence scores and justify their answers feel like progress, but they're just sophisticated ways of saying "I don't know either." The industry has convinced itself that self-doubt is a feature when it's actually a bug we've dressed up as responsibility.

## Uncertainty theatre

These confidence estimation systems create elaborate pantomimes of caution. The model generates an answer, rates its own certainty, then explains why it might be wrong. We've built digital hypochondriacs that overthink every response. This isn't intelligence, it's computational neurosis.

The real kicker is that these confidence scores often correlate poorly with actual accuracy. Models confidently announce they're uncertain about things they get right, then sheepishly admit low confidence in perfect answers. We're optimising for the appearance of self-awareness rather than actual reliability.

## The deployment delusion

Production systems need predictable behaviour, not existential crisis. When a model starts hedging every output with probability distributions and self-evaluation scores, it shifts the decision burden back to humans. We wanted automation but got automated anxiety instead.

The canary deployments and shadow testing mentioned everywhere miss the point entirely. Gradual rollouts won't fix models that second-guess themselves into paralysis. We're solving the wrong problem with increasingly complex workarounds.

Confidence estimation is just another layer of abstraction between us and admitting that current models aren't reliable enough for the tasks we're throwing at them.
