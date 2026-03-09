---
title: "Production fragility is the real AI alignment problem"
date: 2026-03-09
tags: [production-ai, model-reliability, feature-engineering]
summary: "We're obsessing over hypothetical AGI risks whilst our models break every Tuesday because someone added another useless feature."
draft: false
pinned: false
---

Everyone's worried about AI taking over the world. Meanwhile, your recommendation system crashed because marketing wanted to add "user's favourite colour" as a feature. We've got the alignment problem backwards.

## Every feature is a single point of failure

The real alignment problem isn't philosophical. It's operational. Every additional feature creates another dependency that can break your model in production. That upstream service that provides "time since last login"? It goes down and suddenly your fraud detection thinks everyone's suspicious.

We're building brittle systems and calling them intelligent. Adding more features feels like progress, but it's often just adding more ways for things to go wrong.

## The illusion of improvement

More data should mean better models, right? Wrong. Most features add noise, not signal. They make your model look better on test sets whilst making it fragile in the real world. Your accuracy might go from 94% to 95%, but your system availability drops from 99.9% to 95% because now you depend on seventeen different APIs.

The best production AI systems we've seen are ruthlessly simple. They use fewer features, not more. They prioritise reliability over marginal gains.

## Robustness beats cleverness

Stop optimising for benchmark performance. Start optimising for production stability. The model that works every day is worth more than the model that works perfectly once.

Your users don't care about your F1 score. They care that your system actually works when they need it.
