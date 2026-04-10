---
title: "Specialised compute is just admitting general intelligence was never the goal"
date: 2026-04-10
tags: [compute-architecture, specialisation, infrastructure]
summary: "The race to build NPUs, TPUs, and LPUs proves we never actually wanted AGI, just faster autocomplete with better margins."
draft: false
pinned: false
---

Every new compute architecture announcement sounds like a confession. NPUs for inference, TPUs for training, LPUs for language, CPUs for control flow. We're not building towards general intelligence. We're building a Victorian factory where each machine does one job really well.

## The efficiency trap

Silicon vendors keep promising specialised chips will solve our scaling problems. Lower power consumption, faster inference, better cost per token. What they're actually selling is admission that transformers are terrible at everything except the narrow tasks we've optimised them for. If these models were genuinely intelligent, they'd run efficiently on general-purpose hardware. Instead, we need bespoke silicon just to make them economically viable.

## Flexibility is the casualty

Each specialised architecture locks us deeper into current approaches. NPUs assume inference patterns that work today. TPUs bet on training methods that might be obsolete next year. Meanwhile, the real breakthroughs happen in software, not silicon. Attention mechanisms, mixture of experts, state space models. All of these ran fine on existing hardware before someone decided they needed custom chips.

The compute architecture proliferation isn't progress towards AGI. It's industrialisation of pattern matching. We're not building thinking machines. We're building very expensive, very fast typewriters that need their own power stations.
