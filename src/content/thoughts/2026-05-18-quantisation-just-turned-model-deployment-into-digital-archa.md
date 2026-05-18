---
title: "Quantisation just turned model deployment into digital archaeology"
date: 2026-05-18
tags: [quantisation, deployment, compression, inference]
summary: "We're compressing models so aggressively that deployment has become an exercise in reconstructing what the original model was supposed to do."
draft: false
pinned: false
---

Model quantisation has gone from a neat optimisation trick to digital necromancy. We're taking perfectly good FP16 models and crushing them through FP8, GPTQ, and SmoothQuant until they're archaeological fragments of their former selves. Then we spend weeks benchmarking perplexity scores trying to figure out if we've preserved the essence or just created an expensive random number generator.

## The compression spiral

The tooling keeps getting better, which only makes the problem worse. LLMCompressor gives us more ways to mangle models with scientific precision. We can measure exactly how much intelligence we've squeezed out at each compression step. But measuring the damage doesn't mean we understand what we've lost.

## Nobody knows what survives the crush

The real issue isn't the benchmarks, it's that we're compressing models we don't fully understand in the first place. When you take a 70B parameter model down to 4-bit quantisation, you're making thousands of micro-decisions about what matters. The model can't tell you what it needs to keep working. We're performing surgery with a sledgehammer and calling it precision engineering.

Every production deployment has become a gamble on whether the compressed version will handle edge cases the same way. We've turned model serving into digital forensics, trying to reconstruct the original model's behaviour from heavily compressed remains.
