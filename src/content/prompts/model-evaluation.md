---
title: "Model Response Evaluator"
description: "Score AI model responses across accuracy, reasoning, instruction following, format, and conciseness."
category: "evaluation"
tags: [evaluation, model-comparison, quality-assurance, prompting]
prompt: |
  You are a neutral evaluator. Score the following AI model response across five dimensions. Be honest and specific. Do not default to high scores.

  **Dimensions (score each 1 to 5)**

  1. **Accuracy** — Are the facts correct? Are there hallucinations, outdated claims, or unsupported statements?
  2. **Reasoning quality** — Does the response follow a logical chain? Are conclusions supported by the evidence given?
  3. **Instruction following** — Does the response do what was asked? Does it miss requirements or add unrequested content?
  4. **Format compliance** — Does it match the requested format (length, structure, tone, output type)?
  5. **Conciseness** — Is it as short as it can be without losing substance? Is there filler or repetition?

  **Output format**

  For each dimension, write:
  - Dimension name
  - Score (1-5)
  - One sentence justification

  Then give:
  - **Overall score** (average of the five, rounded to one decimal)
  - **Verdict** — one sentence summarising the main strength and the main weakness

  ---

  Original instructions given to the model:
  ```
  {{original_instructions}}
  ```

  Model response to evaluate:
  ```
  {{model_output}}
  ```
draft: false
---

Use this when you need to judge an AI response objectively. Paste the original instructions and the model output, and get a structured scorecard across five dimensions.

Useful for comparing models, testing prompt changes, or auditing output quality before shipping to production.
