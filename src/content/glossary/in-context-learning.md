---
title: "In-Context Learning"
description: "Teaching a model how to behave by giving examples in the prompt itself, without changing any weights."
tags: [prompting, technique, concept]
date: 2026-04-03
related: [zero-shot, prompt-engineering, chain-of-thought]
draft: false
---

In-context learning is when a model picks up a new task just from examples provided in the prompt. You show it a few input-output pairs, then give it a new input, and it follows the pattern. No training run, no weight updates, no fine-tuning. The model figures out what you want from the context alone.

**How it works:** You include examples in the prompt like "Input: X, Output: Y" repeated a few times, then provide a new input without the output. The model extrapolates the pattern and generates the expected output. This is also called few-shot prompting. If you provide just one example, it is one-shot. If you provide none, it is zero-shot.

**Why it is remarkable:** This was not an intended feature. It emerged as models got larger. No one trained GPT-3 to learn from examples at inference time. It just started doing it. The ability scales with model size, and larger models are significantly better at picking up complex patterns from fewer examples.

**Practical tips:** Choose examples that are diverse and representative. The format of your examples matters as much as the content. If the model is not following the pattern, adding one more well-chosen example often fixes it more reliably than adding more instructions.
