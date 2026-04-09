---
title: "Sampling"
description: "The process of picking the next token during generation."
tags: [concept, models, technique]
date: 2026-04-03
related: [temperature, inference, tokenisation]
draft: false
---

Sampling is how a language model chooses the next token from its predicted probability distribution. The model does not deterministically pick the most likely token every time. Instead, it uses a sampling strategy that balances predictability with creativity. The choice of strategy significantly affects the style and quality of the output.

**Common strategies:** Greedy decoding always picks the highest-probability token (deterministic but often repetitive). Top-k sampling restricts the choice to the k most likely tokens. Top-p (nucleus) sampling picks from the smallest set of tokens whose probabilities add up to p. Temperature scaling adjusts how peaked or flat the distribution is before sampling.

**Why it matters:** Sampling parameters are the main knobs you turn to control output behaviour. Want factual, consistent answers? Use low temperature and low top-p. Want creative writing or brainstorming? Raise the temperature. Understanding sampling helps you debug unexpected model behaviour.

**In practice:** Most APIs expose temperature and top-p as parameters. Some also offer top-k, frequency penalties, and presence penalties. These interact with each other, so changing one may require adjusting others. For production systems, it is worth testing different sampling configurations on representative inputs before committing.
