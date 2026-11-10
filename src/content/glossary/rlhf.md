---
title: "Reinforcement Learning from Human Feedback (RLHF)"
description: "A training method where humans rate model outputs to guide the model toward better behaviour."
tags: [training, safety, technique]
date: 2026-04-03
related: [fine-tuning, foundation-model, llm]
draft: false
---

RLHF is a training technique where human evaluators rank model outputs from best to worst, and those rankings are used to train a reward model. The reward model then guides the language model toward outputs that humans prefer. This is how raw pre-trained models get turned into helpful, harmless assistants.

**Why it matters:** Pre-trained models are good at predicting text but not at being useful or safe. They might produce toxic content, ignore instructions, or give unnecessarily verbose answers. RLHF aligns the model's behaviour with human preferences, making it actually pleasant to interact with.

**How it works:** First, the model generates multiple responses to the same prompt. Human annotators rank these responses. A reward model is trained on these rankings to predict which outputs humans would prefer. Finally, the language model is fine-tuned using reinforcement learning (typically PPO or DPO) to maximise the reward model's score.

**Limitations:** RLHF is expensive and slow because it requires human annotation at scale. The reward model can also develop blind spots or be gamed. Some labs are exploring alternatives like RLAIF (using AI feedback instead of human feedback) and Constitutional AI (defining principles rather than collecting individual ratings).
