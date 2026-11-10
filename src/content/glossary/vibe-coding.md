---
title: "Vibe Coding"
description: "Writing software by describing what you want to an AI and iterating on the output."
tags: [technique, agents, tooling]
date: 2026-04-03
related: [agentic-loop, tool-use, prompt-engineering]
draft: false
---

Vibe coding is a style of software development where you describe what you want in natural language and let an AI write the code. You guide the process through conversation, reviewing outputs and giving feedback, rather than writing every line yourself. The term was coined by Andrej Karpathy in early 2025 and quickly caught on.

**How it works in practice:** You open a coding assistant (Cursor, Claude Code, Copilot, Windsurf) and describe the feature, bug fix, or refactor you want. The AI generates the code. You review it, test it, and ask for changes if needed. The loop of describe, generate, review, refine is the core workflow.

**Why it took off:** LLMs got good enough at code generation that many tasks are faster to describe than to write manually. For prototyping, boilerplate, and unfamiliar frameworks, vibe coding can be dramatically faster than traditional development. It also lowers the barrier for non-programmers to build functional software.

**The debate:** Critics argue that vibe coding produces code the developer does not fully understand, creating maintenance debt. Proponents counter that understanding and authoring are different skills, and that AI-assisted review can catch issues a solo developer might miss. The practical middle ground is using vibe coding for speed while maintaining enough understanding to debug and maintain what gets produced.
