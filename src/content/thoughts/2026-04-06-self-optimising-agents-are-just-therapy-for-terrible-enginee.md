---
title: "Self-optimising agents are just therapy for terrible engineers"
date: 2026-04-06
tags: [agent-optimisation, prompt-engineering, automation]
summary: "AutoAgent and similar tools that let AI systems tune themselves overnight are just covering up for engineers who can't be bothered to understand their own prompts."
draft: false
pinned: false
---

The latest trend in AI tooling is systems that optimise themselves. AutoAgent promises to tune your prompts overnight while you sleep. Your agent wakes up smarter, faster, better. It sounds brilliant until you realise what's actually happening: we've automated incompetence.

## The feedback loop fallacy

These self-optimising systems work by running thousands of iterations against benchmarks, tweaking parameters, and measuring performance. It's brute force disguised as intelligence. The real problem isn't that prompt tuning is tedious. The problem is that most engineers never understood what their prompts were supposed to do in the first place.

You wouldn't let a system auto-optimise your database queries without understanding your schema. You wouldn't auto-tune your API rate limits without knowing your traffic patterns. But somehow we think it's fine to let an agent rewrite its own instructions because "the AI knows best."

## Benchmarks aren't production

The bigger issue is that these systems optimise for synthetic metrics that rarely match real-world performance. Your agent might get better at answering benchmark questions whilst becoming completely useless at the actual task you built it for. We're teaching machines to game tests instead of solving problems.

Good prompt engineering isn't about finding the magic incantation that boosts your score. It's about understanding the problem space, knowing your failure modes, and writing instructions that guide the model towards useful behaviour. You can't automate that understanding away.

Self-optimising agents are a productivity trap. They make bad engineers feel productive whilst making good engineers lazy.
