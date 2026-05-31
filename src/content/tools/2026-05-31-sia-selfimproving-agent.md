---
title: "SIA: Self-Improving Agent"
description: "An open-source agent that updates both its own code scaffold and model weights based on performance feedback."
url: "https://www.marktechpost.com/2026/05/29/hexo-labs-open-sources-sia-a-self-improving-agent-that-updates-both-the-harness-and-the-model-weights/"
status: experimental
tags: [self-improvement, agents, open-source, lora, feedback-loops]
draft: false
---

Hexo Labs released SIA under MIT licence, and it's a proper self-improving system. Most agent frameworks let you tweak prompts or add tools, but SIA goes further. It rewrites its own execution scaffold and triggers LoRA weight updates on the underlying model.

Here's how it works. A feedback agent reads each run's trajectory and decides whether to modify the code structure or update model weights. The system beat scaffold-only approaches on LawBench, GPU kernel tasks, and biological sequence analysis.

We've seen plenty of "self-improving" agents that just retry with different prompts. SIA actually changes the agent's fundamental behaviour patterns. The combination of code rewriting and weight updates creates a genuine learning loop.

This matters because most production agents hit performance ceilings quickly. You can optimise prompts and add retrieval, but you're still working within fixed parameters. SIA breaks that constraint by treating both the execution environment and model weights as mutable.

The code is available now. Worth experimenting with if you're building agents that need to adapt beyond their initial training.
