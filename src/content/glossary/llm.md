---
title: "Large Language Model (LLM)"
description: "A neural network trained to predict and generate text at scale."
tags: [models, concept, architecture]
date: 2026-04-03
related: [foundation-model, tokenisation, attention-mechanism]
draft: false
---

A large language model is a neural network with billions of parameters, trained on vast amounts of text to predict the next token in a sequence. That single objective, next-token prediction, turns out to be enough for the model to learn grammar, facts, reasoning patterns, coding ability, and more. GPT-4, Claude, Gemini, and Llama are all LLMs.

**How they work:** At their core, LLMs are transformer networks that process text as tokens. During training, they see trillions of tokens and adjust their weights to get better at predicting what comes next. At inference time, they generate text one token at a time, each token conditioned on everything that came before it.

**Why "large" matters:** Scale is not just a marketing term. Larger models consistently show emergent capabilities that smaller models lack, like in-context learning, chain-of-thought reasoning, and instruction following. The relationship between scale and capability drove the rapid investment in bigger models from 2020 onward.

**The ecosystem:** LLMs are typically used through APIs (pay per token) or run locally with open-weight models. Most production applications layer additional techniques on top: system prompts for behaviour, RAG for knowledge, fine-tuning for specialisation, and tool use for real-world actions.
