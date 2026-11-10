---
title: "Quantization"
description: "Compressing a model by reducing the precision of its numbers."
tags: [performance, infrastructure, technique]
date: 2026-04-03
related: [inference, latency, llm]
draft: false
---

Quantization shrinks a model by representing its weights with fewer bits. A standard model uses 16-bit floating point numbers. Quantizing to 8-bit halves the memory. Going to 4-bit quarters it. The model gets smaller, faster, and cheaper to run, with some trade-off in output quality.

**Why it matters:** Running large models requires expensive GPU memory. A 70 billion parameter model at 16-bit precision needs around 140GB of VRAM. Quantized to 4-bit, it fits in about 35GB, making it runnable on a single high-end consumer GPU instead of a multi-GPU server.

**How it works:** The simplest approach (post-training quantization) takes a trained model and rounds its weights to lower precision. More sophisticated methods like GPTQ and AWQ use calibration data to minimise quality loss during the conversion. QLoRA combines quantization with fine-tuning, letting you train on quantized models efficiently.

**Quality impact:** 8-bit quantization usually has negligible quality loss. 4-bit is noticeable but often acceptable, especially for larger models where there is more redundancy in the weights. Below 4-bit, quality drops sharply. The sweet spot depends on your model size and how much quality you can afford to trade for speed and cost savings.
