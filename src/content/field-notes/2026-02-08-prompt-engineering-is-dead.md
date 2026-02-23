---
title: "Prompt engineering is already dying"
date: 2026-02-08
tags: [prompting, agents, opinion, hot-take]
summary: "The models are getting good enough that you don't need to trick them into doing their job."
draft: false
---

Remember when you had to say "you are an expert in..." or "think step by step" to get decent output? Those days are fading fast.

The latest models understand intent well enough that plain English works. "Write me a Python function that parses CSV files" gets you the same result whether or not you prepend three paragraphs of role-playing instructions.

## What's replacing it

Tool use and structured outputs. Instead of crafting the perfect prompt, you give the model tools and let it figure out the approach. Instead of hoping it formats the output right, you define a schema and it fills it in.

That's a much better interface. Deterministic where it needs to be, flexible where it doesn't.

## The exception

System prompts still matter for setting tone and constraints. If you want a specific voice or need to enforce guardrails, you still need to spell that out. But the elaborate multi-paragraph prompting rituals? Increasingly unnecessary.

The skill that matters now isn't "how to talk to AI." It's "what to build with it."
