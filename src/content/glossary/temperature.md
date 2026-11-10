---
title: "Temperature"
description: "A parameter that controls how random model outputs are."
tags: [concept, prompting, technique]
date: 2026-04-03
related: [sampling, inference, prompt-engineering]
draft: false
---

Temperature is a number (usually between 0 and 2) that controls the randomness of a model's output. At temperature 0, the model always picks the most likely next token, giving you deterministic, conservative responses. At higher temperatures, less likely tokens get a better chance of being selected, producing more varied and creative output.

**How it works:** The model outputs a probability distribution over all possible next tokens. Temperature scales these probabilities before sampling. Low temperature sharpens the distribution (the top choice dominates). High temperature flattens it (more tokens become viable choices). At temperature 0, it collapses to greedy decoding.

**When to use what:** For factual queries, code generation, and structured outputs, use low temperature (0 to 0.3). For creative writing, brainstorming, and exploration, try higher values (0.7 to 1.0). Values above 1.0 often produce incoherent output and are rarely useful in practice.

**Common mistake:** People adjust temperature when the real problem is the prompt. If the model is giving wrong answers, changing temperature will not fix it. Temperature controls variety, not accuracy. Fix the prompt first, then tune temperature for the right level of diversity.
