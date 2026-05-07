---
title: "Speculative decoding just turned inference into a confidence game"
date: 2026-05-07
tags: [speculative-decoding, inference-optimisation, model-performance]
summary: "Every speedup technique is just teaching models to guess better, and we're running out of good guesses."
draft: false
pinned: false
---

Multi-token prediction drafters and speculative decoding are everywhere now. Google's claiming 3x speedups. Everyone's building faster inference pipelines. But we're not actually making models smarter. We're just teaching them to be more confident about being wrong.

## The speculation economy

Speculative decoding works by having a smaller model guess what the big model would say, then checking if it got it right. When it's correct, you save time. When it's wrong, you fall back to the expensive model. It's brilliant until you realise you're optimising for the cases where you didn't need the big model anyway.

The whole approach assumes that most tokens are predictable enough for a lightweight drafter to nail. That might be true for boilerplate code and generic prose. But the interesting outputs, the creative leaps, the genuinely useful responses? Those are exactly the tokens your drafter will get wrong.

## Diminishing returns on confidence

We're building increasingly sophisticated guessing mechanisms instead of addressing why inference is slow in the first place. Mixture of experts, early exit layers, speculative decoding. All clever ways to avoid doing the full computation when you probably don't need to.

The problem is "probably" isn't good enough when the model's already struggling with reasoning. We're optimising for speed on the easy problems whilst the hard problems still take just as long. And users notice when the AI suddenly gets stupid the moment they ask something non-trivial.

Every speedup technique is just another way of saying the model was doing too much work to begin with.
