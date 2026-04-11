---
title: "Knowledge distillation is just academic procrastination disguised as optimisation"
date: 2026-04-11
tags: [knowledge-distillation, model-compression, deployment, ensemble-learning]
summary: "We're spending months teaching small models to mimic ensemble behaviour instead of just building better single models from the start."
draft: false
pinned: false
---

The entire knowledge distillation pipeline has become an elaborate way to avoid admitting we built the wrong thing. We train massive ensembles, realise they're too slow for production, then spend months teaching a smaller model to pretend it's the ensemble. It's like hiring a mime to replace your entire orchestra.

## The compression theatre

Knowledge distillation treats the symptoms, not the disease. Your ensemble works because it captures different aspects of the problem space. Your single model fails because you optimised for the wrong objective from day one. Instead of fixing the training process, we've built an entire research field around post-hoc fixes.

The teacher-student metaphor sounds clever but it's backwards. We're asking the student to learn compressed representations of mistakes the teacher already made. Those ensemble predictions contain all the biases and overfitting from each component model. We're not distilling knowledge, we're concentrating noise.

## The deployment excuse

Production constraints are real, but knowledge distillation is the wrong solution. If your ensemble needs five models to work, the problem isn't deployment complexity. The problem is that your single model training is fundamentally broken. We've normalised building systems that require multiple attempts to get right, then selling the cleanup process as innovation.

Better data curation, improved loss functions, and smarter architectures solve the same problems without the compression overhead. Knowledge distillation is just expensive model averaging with extra steps and a PhD thesis attached.
