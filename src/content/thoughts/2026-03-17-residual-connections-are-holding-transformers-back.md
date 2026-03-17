---
title: "Residual connections are holding transformers back"
date: 2026-03-17
tags: [architecture, transformers, residual-connections, scaling]
summary: "Fixed residual mixing creates a structural bottleneck that attention-based residuals can finally solve."
draft: false
pinned: false
---

Every transformer just adds layer outputs back to a running hidden state. We've accepted this as gospel since ResNet proved residual connections work. But what if this fixed mixing is actually throttling model performance at scale?

## The residual bottleneck

Standard residual connections treat all prior layer outputs equally. Layer 1's contribution gets the same weight as layer 47's contribution in the final hidden state. This creates a structural problem where early layers can dominate the signal, especially in deeper models. The running hidden state becomes a messy average rather than a selective combination of the most relevant computations.

## Depth-wise attention changes the game

Attention-based residuals let each layer decide which prior outputs matter most. Instead of blind summation, you get learned mixing weights that adapt to the input. Early layers might contribute heavily for simple patterns, while deeper layers take over for complex reasoning tasks. The model learns its own information flow rather than being locked into a fixed architecture.

## Beyond the hype

This isn't just another attention mechanism bolted onto transformers. It's addressing a fundamental limitation in how we combine layer outputs. The early results suggest better scaling behaviour and more efficient use of model depth. That matters when you're training models with hundreds of layers and trying to squeeze performance from every parameter.

Fixed residuals served us well, but they're starting to show their age.
