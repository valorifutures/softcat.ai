---
title: "Prompt Optimisation"
description: "Systematically improve an existing prompt: identify weaknesses, rewrite with fixes, add examples, and define evaluation criteria."
category: "prompt-engineering"
tags: [prompt-engineering, llm, optimisation]
prompt: |
  I have a prompt I want to improve. Analyse it and produce an optimised version.

  **Step 1: Diagnose**
  - What is this prompt trying to achieve?
  - Where is it ambiguous or underspecified?
  - What context is missing that the model needs?
  - Are there instructions that could be misread?

  **Step 2: Rewrite**
  Produce an improved version of the prompt. Apply:
  - A clear task statement at the top
  - Explicit output format and length expectations
  - Any constraints or tone guidance the original implied but didn't state
  - Removal of redundant or contradictory instructions

  **Step 3: Add examples**
  If few-shot examples would help, add one or two. Keep them short. Show the format, not just the content.

  **Step 4: Evaluation criteria**
  List three to five criteria for judging whether the improved prompt is working. These should be things you can check in the model's output, not vague quality signals.

  **Step 5: Explain changes**
  For each significant change, state: what you changed, why it was a problem in the original, and what the fix achieves.

  Do not speculate about whether the prompt will work perfectly. Stick to what the text says and what it leaves out.

  ```
  [paste prompt here]
  ```
draft: false
---

Use this when a prompt is giving inconsistent results or the model keeps missing the point. Works better than tweaking by instinct.

Paste your prompt, run the analysis, then decide which changes to keep. You don't have to accept every suggestion.
