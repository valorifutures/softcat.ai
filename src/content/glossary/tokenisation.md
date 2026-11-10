---
title: "Tokenisation"
description: "The process of splitting text into tokens, the chunks a model actually processes."
tags: [concept, models, architecture]
date: 2026-04-03
related: [context-window, embeddings, llm]
draft: false
---

Tokenisation is how raw text gets broken into the pieces a language model actually works with. These pieces, called tokens, are not always full words. Common words might be a single token, while rare words get split into sub-word fragments. The word "tokenisation" itself might become ["token", "isation"] or ["tok", "en", "isation"] depending on the tokeniser.

**Why it matters:** Everything in an LLM is measured in tokens: context window size, pricing, rate limits, and generation speed. Understanding tokenisation helps you estimate costs, stay within context limits, and debug unexpected model behaviour. A prompt that looks short in words might be long in tokens if it contains code, URLs, or non-English text.

**How tokenisers work:** Most modern models use byte-pair encoding (BPE) or similar algorithms. The tokeniser starts with individual characters, then iteratively merges the most frequent pairs into new tokens. The result is a vocabulary of typically 32,000 to 128,000 tokens that balances coverage with efficiency.

**Things to know:** Different models use different tokenisers, so the same text produces different token counts across models. Non-English languages and code often tokenise less efficiently (more tokens per word). Spaces, punctuation, and formatting all consume tokens. Most API providers offer a tokeniser tool or library so you can count tokens before sending requests.
