---
title: "Zero-Shot"
description: "Asking a model to do something without any examples in the prompt."
tags: [prompting, technique, concept]
date: 2026-04-03
related: [in-context-learning, prompt-engineering, chain-of-thought]
draft: false
---

Zero-shot means asking a model to perform a task without providing any examples in the prompt. You just describe what you want and let the model figure it out from its training. "Classify this review as positive or negative" with no examples is a zero-shot prompt. If you add a few examples first, it becomes few-shot.

**Why it matters:** Zero-shot performance is the baseline measure of a model's capability. If a model can handle a task zero-shot, it means the ability is already baked into its weights from pre-training. This is the simplest way to use any model and requires no prompt engineering beyond a clear instruction.

**When it works:** Modern large models handle common tasks well in zero-shot mode: sentiment analysis, summarisation, translation, simple classification, and general question answering. The tasks they struggle with zero-shot tend to be ones requiring specific formats, unusual reasoning patterns, or domain-specific knowledge.

**Check what is zero-shot:** The term can describe a prompt, a task, an object or an environment. A system may be zero-shot for the evaluation setting while still being fine-tuned for the task. Figure's [Helix 2.5 evaluation](https://www.figure.ai/news/helix-2-5-zero-shot-30-home-generalization), for example, withheld the 30 homes and their objects but adapted the model to three named behaviours using data collected elsewhere. Read the evaluation definition before comparing results.

**When to add examples:** If zero-shot output is inconsistent or wrong, adding examples (few-shot) is the first thing to try. Even one or two well-chosen examples can dramatically improve results. Think of zero-shot as the starting point and few-shot as the first upgrade when you need better performance.

*Editorial review, 21 September 2026: clarified that zero-shot claims depend on what was withheld. The original publication date is preserved.*
