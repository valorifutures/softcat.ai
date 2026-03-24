---
title: "Reasoning phases are just expensive preprocessing with delusions of intelligence"
date: 2026-03-24
tags: [reasoning, inference, performance]
summary: "Adding a 'thinking step' before generation is just prompt engineering disguised as architectural innovation."
draft: false
pinned: false
---

The latest trend in AI development is slapping a "reasoning phase" onto existing models and calling it revolutionary. Whether it's intention-based image generation or multi-step text reasoning, we're seeing the same pattern everywhere: take a working model, add an expensive preprocessing step, and market it as a breakthrough in AI cognition.

## The preprocessing illusion

These reasoning phases aren't fundamentally different from careful prompt engineering or multi-stage pipelines. When a model "thinks" before generating an image, it's just running through a structured decomposition of the task. The same outcome could be achieved with better training data or more sophisticated conditioning mechanisms. We've simply moved the complexity from the training phase to the inference phase, where it costs more to run.

## Inference tax for marginal gains

The real cost here isn't computational, it's philosophical. By adding reasoning layers, we're admitting that our base models can't handle complex tasks in one pass. Instead of building better foundations, we're stacking expensive workarounds on top of existing architectures. Each reasoning step doubles your inference costs whilst delivering improvements that could have been baked into the model during training.

The industry is confusing deliberation with intelligence, and charging users for the privilege.
