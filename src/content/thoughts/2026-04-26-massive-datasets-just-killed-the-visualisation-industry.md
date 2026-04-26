---
title: "Massive datasets just killed the visualisation industry"
date: 2026-04-26
tags: [data-visualisation, performance, scale]
summary: "Traditional plotting libraries are crumbling under datasets that modern AI systems produce as routine byproducts."
draft: false
pinned: false
---

We've been pretending matplotlib can handle modern data for far too long. While everyone obsesses over model architectures and training efficiency, the real bottleneck has quietly shifted to something embarrassingly mundane: drawing charts that don't crash your browser.

## The scale mismatch problem

AI systems now routinely generate millions of data points during training runs, inference traces, and evaluation cycles. Token-level attention maps, gradient flows across epochs, embedding space visualisations. These aren't edge cases anymore, they're Tuesday. Traditional plotting libraries were built for thousands of points, maybe tens of thousands on a good day. They buckle under datasets that modern transformer architectures produce as exhaust fumes.

## Performance becomes the feature

Tools like Datashader aren't just faster plotting libraries. They're admitting that visualisation is now a compute problem, not a design problem. When your dataset has 50 million points, aesthetics become irrelevant. What matters is whether you can see patterns without waiting three minutes for a scatter plot to render. The performance characteristics of your visualisation stack now matter more than colour palettes or font choices.

The industry spent decades optimising model inference and training pipelines. Meanwhile, the humble bar chart became the new computational bottleneck.
