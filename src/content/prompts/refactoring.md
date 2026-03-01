---
title: "Code Refactor Planner"
description: "Get a concrete refactoring plan before touching the code. Reduces risk."
category: "refactoring"
tags: [refactoring, code-quality, planning]
prompt: |
  I want to refactor the following code. Before making any changes, give me a plan.

  For the plan:
  1. Describe what the code currently does (so I can confirm you've understood it correctly).
  2. Identify the top problems: duplication, unclear intent, fragile dependencies, missing abstractions, etc.
  3. Propose a refactoring sequence. Break it into steps I can do independently and safely.
  4. For each step, state: what changes, why it improves things, and what could go wrong.
  5. Flag anything that needs a test before refactoring (so I don't break behaviour I can't see).

  Do not write the refactored code yet. I want to review the plan first.

  ```
  [paste code here]
  ```
draft: false
---

Forces planning before touching code. Useful when the codebase is unfamiliar or the refactor is risky.

Review the plan, push back on anything you disagree with, then ask for the code. Keeps the model honest about what it's changing and why.
